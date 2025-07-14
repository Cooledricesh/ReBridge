# ReBridge 배포 가이드

## 1. 배포 전 체크리스트

### 환경변수 확인
```bash
npm run check-env
```

### 필수 환경변수:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `REDIS_URL`: Redis 연결 문자열
- `NEXTAUTH_URL`: 프로덕션 URL (예: https://rebridge.kr)
- `NEXTAUTH_SECRET`: 보안 시크릿 (openssl rand -base64 32)
- `UPSTASH_REDIS_REST_URL`: Upstash Redis URL
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis 토큰

### 선택 환경변수:
- OAuth 제공자 키 (KAKAO_CLIENT_ID, KAKAO_CLIENT_SECRET 등)
- 이메일 설정 (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
- 모니터링 (SENTRY_DSN, SLACK_WEBHOOK_URL)

## 2. 빌드 및 테스트

```bash
# 의존성 설치
pnpm install --frozen-lockfile

# 타입 체크
pnpm typecheck

# 린트
pnpm lint

# 테스트
pnpm test

# 프로덕션 빌드
pnpm build
```

## 3. 데이터베이스 마이그레이션

```bash
# Prisma 클라이언트 생성
cd packages/database
npx prisma generate

# 데이터베이스 마이그레이션
npx prisma migrate deploy
```

## 4. 배포 옵션

### Option 1: Vercel (권장 - Next.js 앱)

1. Vercel에 GitHub 리포지토리 연결
2. 환경변수 설정
3. 빌드 설정:
   - Framework: Next.js
   - Build Command: `pnpm build`
   - Output Directory: `.next`
   - Install Command: `pnpm install`

### Option 2: Railway

1. Railway 프로젝트 생성
2. PostgreSQL, Redis 서비스 추가
3. 환경변수 설정
4. 배포 설정:
   ```toml
   # railway.toml
   [build]
   builder = "nixpacks"
   buildCommand = "pnpm install && pnpm build"
   
   [deploy]
   startCommand = "pnpm start"
   ```

### Option 3: Docker

```dockerfile
# Dockerfile
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/*/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["pnpm", "start"]
```

## 5. 크롤러 배포

크롤러는 별도의 워커로 배포:

### Railway Worker
```toml
# crawler.railway.toml
[build]
builder = "nixpacks"
buildCommand = "pnpm install && pnpm exec playwright install chromium"

[deploy]
startCommand = "cd apps/crawler && pnpm start"
```

### Docker Compose
```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL
      - REDIS_URL
    depends_on:
      - postgres
      - redis
  
  crawler:
    build: .
    command: cd apps/crawler && pnpm start
    environment:
      - DATABASE_URL
      - REDIS_URL
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: rebridge
      POSTGRES_USER: rebridge_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 6. 배포 후 확인사항

1. **헬스체크 엔드포인트 확인**
   ```bash
   curl https://your-domain.com/api/health
   ```

2. **크롤러 로그 확인**
   ```bash
   # Railway
   railway logs -s crawler
   
   # Docker
   docker logs rebridge-crawler
   ```

3. **모니터링 설정**
   - Sentry 에러 추적
   - Uptime 모니터링 (UptimeRobot, Pingdom)
   - 로그 수집 (Logtail, Datadog)

## 7. 롤백 계획

문제 발생 시:
1. 이전 버전으로 재배포
2. 데이터베이스 백업에서 복원
3. Redis 캐시 초기화

## 8. 성능 최적화

1. **CDN 설정**
   - Cloudflare 또는 Vercel Edge Network 사용
   - 정적 자산 캐싱

2. **데이터베이스 최적화**
   - Connection pooling 설정
   - 인덱스 확인
   - Query 성능 모니터링

3. **Redis 캐싱**
   - TTL 설정 검토
   - 메모리 사용량 모니터링