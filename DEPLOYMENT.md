# ReBridge 프로덕션 배포 가이드

## 필수 클라우드 서비스 설정

### 1. PostgreSQL 데이터베이스 (Supabase 추천)

1. [Supabase](https://supabase.com) 가입 및 프로젝트 생성
2. Settings > Database에서 Connection string 복사
3. `DATABASE_URL` 형식:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public
   ```

### 2. Redis 캐시 (Upstash 추천)

1. [Upstash](https://upstash.com) 가입 및 Redis 데이터베이스 생성
2. Redis Details에서 Redis URL 복사
3. `REDIS_URL` 형식:
   ```
   redis://default:[PASSWORD]@[ENDPOINT].upstash.io:6379
   ```

### 3. Vercel 환경 변수 설정

Vercel 대시보드 > Settings > Environment Variables에서 설정:

```bash
# 필수 환경 변수
DATABASE_URL="postgresql://..."  # Supabase에서 복사
REDIS_URL="redis://..."          # Upstash에서 복사
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="..."            # openssl rand -base64 32로 생성

# 선택 환경 변수
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

### 4. 데이터베이스 마이그레이션

1. Supabase Extensions 활성화:
   - Supabase Dashboard > Database > Extensions
   - `pg_trgm`과 `pgcrypto` 활성화

2. 로컬에서 Supabase 연결:
   ```bash
   cd packages/database
   # .env의 DATABASE_URL을 Supabase URL로 임시 변경
   npx prisma db push
   ```

3. 초기 데이터 설정 (선택사항):
   ```bash
   # 크롤러가 자동으로 데이터를 수집하므로 초기 데이터는 필요 없음
   ```

### 5. 배포 명령어

```bash
# 프로젝트 루트에서
cd apps/web
vercel

# 프로덕션 배포
vercel --prod
```

## 무료 티어 제한사항

- **Supabase**: 500MB 데이터베이스, 2GB 전송량/월
- **Upstash Redis**: 10,000 명령/일, 256MB 저장공간
- **Vercel**: 100GB 대역폭/월, 무제한 배포

## 프로덕션 체크리스트

- [ ] Supabase 프로젝트 생성 및 DATABASE_URL 설정
- [ ] Upstash Redis 생성 및 REDIS_URL 설정
- [ ] NEXTAUTH_SECRET 새로 생성
- [ ] NEXTAUTH_URL을 Vercel URL로 설정
- [ ] Prisma 스키마를 프로덕션 DB에 적용
- [ ] Vercel 환경 변수 모두 설정
- [ ] 빌드 및 배포 테스트

## 트러블슈팅

### Prisma 연결 오류
- Supabase는 연결 풀링이 필요할 수 있음
- Connection string 끝에 `?pgbouncer=true&connection_limit=1` 추가

### Redis 연결 오류
- Upstash는 TLS 연결 사용
- `REDIS_URL`이 `rediss://` (두 개의 s)로 시작하는지 확인

### NextAuth 오류
- NEXTAUTH_URL이 실제 배포 URL과 일치하는지 확인
- NEXTAUTH_SECRET이 프로덕션용으로 새로 생성되었는지 확인