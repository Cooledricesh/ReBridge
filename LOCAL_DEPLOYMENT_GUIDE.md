# ReBridge 로컬 서버 배포 가이드

## 개요
이 문서는 ReBridge 프로젝트를 로컬 서버에서 실행하고 외부에서 접근할 수 있도록 설정하는 방법을 설명합니다.

## 사전 요구사항
- Node.js 18.0.0 이상
- pnpm 9.0.0 이상
- Docker 및 Docker Compose
- PM2 (프로세스 관리자)
- ngrok 또는 Cloudflare Tunnel (외부 접근용)

## 1. 프로젝트 설정

### 1.1 저장소 클론 및 의존성 설치
```bash
git clone https://github.com/yourusername/ReBridge.git
cd ReBridge
pnpm install
```

### 1.2 환경 변수 설정
```bash
# .env.local 파일 생성
cp apps/web/.env.example apps/web/.env.local
```

`.env.local` 파일 수정:
```env
# 데이터베이스 (Docker 사용 시)
DATABASE_URL="postgresql://rebridge:rebridge_dev_password@localhost:5432/rebridge_dev?schema=public"

# Redis (Docker 사용 시)
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"  # 외부 접근 시 ngrok URL로 변경
NEXTAUTH_SECRET="생성한-시크릿-키"  # openssl rand -base64 32로 생성

# 앱 URL (외부 접근 시 ngrok URL로 변경)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# 카카오 OAuth (선택사항)
KAKAO_CLIENT_ID="your-kakao-client-id"
KAKAO_CLIENT_SECRET="your-kakao-client-secret"
```

### 1.3 인프라 시작 (PostgreSQL, Redis)
```bash
docker-compose up -d
```

### 1.4 데이터베이스 설정
```bash
cd apps/web
npx prisma generate
npx prisma db push
cd ../..
```

## 2. 프로덕션 빌드

```bash
# 전체 프로젝트 빌드
pnpm build

# 또는 개별 빌드
pnpm --filter @rebridge/web build
pnpm --filter @rebridge/crawler build
```

## 3. PM2를 사용한 서비스 실행

### 3.1 PM2 설치
```bash
npm install -g pm2
```

### 3.2 ecosystem.config.js 설정 확인
```javascript
module.exports = {
  apps: [
    {
      name: 'rebridge-web',
      script: 'pnpm',
      args: 'start',
      cwd: './apps/web',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'rebridge-crawler',
      script: 'pnpm',
      args: 'start',
      cwd: './apps/crawler',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

### 3.3 서비스 시작
```bash
# 모든 서비스 시작
pm2 start ecosystem.config.js

# 서비스 상태 확인
pm2 status

# 로그 확인
pm2 logs

# 특정 서비스 로그
pm2 logs rebridge-web
pm2 logs rebridge-crawler
```

### 3.4 PM2 시작 시 자동 실행 설정
```bash
pm2 startup
pm2 save
```

## 4. 외부 접근 설정

### 옵션 1: ngrok 사용
```bash
# ngrok 설치
brew install ngrok  # macOS
# 또는 https://ngrok.com/download 에서 다운로드

# ngrok 실행
ngrok http 3000

# 생성된 URL 확인 (예: https://abc123.ngrok.io)
```

### 옵션 2: Cloudflare Tunnel 사용
```bash
# cloudflared 설치
brew install cloudflared  # macOS

# 터널 실행
cloudflared tunnel --url http://localhost:3000
```

### 옵션 3: 고정 IP + 포트포워딩
1. 라우터에서 3000번 포트를 서버로 포트포워딩
2. 방화벽에서 3000번 포트 열기
3. 도메인 또는 공인 IP로 접근

## 5. 환경 변수 업데이트 (외부 접근 시)

외부 URL이 확정되면 환경 변수를 업데이트합니다:

```bash
# .env.local 수정
NEXTAUTH_URL="https://your-domain.com"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

변경 후 서비스 재시작:
```bash
pm2 restart all
```

## 6. 모니터링 및 관리

### 로그 실시간 확인
```bash
pm2 logs --lines 100
```

### 서비스 재시작
```bash
pm2 restart rebridge-web
pm2 restart rebridge-crawler
```

### 서비스 중지
```bash
pm2 stop all
```

### 서비스 삭제
```bash
pm2 delete all
```

### PM2 대시보드
```bash
pm2 monit
```

## 7. 문제 해결

### 포트 충돌
```bash
# 3000번 포트 사용 중인 프로세스 확인
lsof -i :3000

# 다른 포트로 변경
PORT=3001 pm2 start ecosystem.config.js
```

### Prisma 클라이언트 오류
```bash
cd apps/web
npx prisma generate
cd ../..
pm2 restart all
```

### 메모리 부족
```bash
# PM2 메모리 제한 설정
pm2 start ecosystem.config.js --max-memory-restart 1G
```

## 8. 보안 고려사항

1. **방화벽 설정**: 필요한 포트만 열기
2. **HTTPS 설정**: 프로덕션에서는 SSL 인증서 사용
3. **환경 변수 보안**: .env 파일은 절대 커밋하지 않기
4. **정기적 업데이트**: 의존성 및 보안 패치 적용

## 9. 백업 및 복구

### 데이터베이스 백업
```bash
docker exec postgres pg_dump -U rebridge rebridge_dev > backup.sql
```

### 데이터베이스 복구
```bash
docker exec -i postgres psql -U rebridge rebridge_dev < backup.sql
```

## 10. 성능 최적화

### PM2 클러스터 모드
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'rebridge-web',
    script: 'pnpm',
    args: 'start',
    cwd: './apps/web',
    instances: 'max',  // CPU 코어 수만큼 인스턴스 생성
    exec_mode: 'cluster'
  }]
};
```

### 캐시 설정
- Redis TTL 조정
- Next.js 정적 페이지 캐싱
- CDN 활용 (정적 자산)

## 참고 링크
- [PM2 문서](https://pm2.keymetrics.io/docs/)
- [ngrok 문서](https://ngrok.com/docs)
- [Cloudflare Tunnel 문서](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)