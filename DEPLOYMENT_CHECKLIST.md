# 🚀 ReBridge 프로덕션 배포 체크리스트

## 배포 전 필수 확인 사항

### 1. 환경 변수 설정
- [ ] `DATABASE_URL` - PostgreSQL 연결 문자열 설정
- [ ] `REDIS_URL` - Redis 연결 문자열 설정
- [ ] `NEXTAUTH_URL` - 프로덕션 도메인 URL 설정 (예: https://rebridge.kr)
- [ ] `NEXTAUTH_SECRET` - 강력한 비밀키 생성 (아래 명령어 사용)
  ```bash
  openssl rand -base64 32
  ```
- [ ] `NEXT_PUBLIC_APP_URL` - 프론트엔드 URL 설정

### 2. 데이터베이스 준비
- [ ] PostgreSQL 데이터베이스 생성 완료
- [ ] Prisma 마이그레이션 실행
  ```bash
  cd packages/database
  pnpm prisma migrate deploy
  ```
- [ ] 초기 시드 데이터 필요 시 실행
  ```bash
  pnpm prisma db seed
  ```

### 3. Redis 설정
- [ ] Redis 인스턴스 준비 (Upstash 또는 자체 호스팅)
- [ ] 연결 테스트 완료

### 4. 빌드 및 테스트
- [ ] 의존성 설치
  ```bash
  pnpm install
  ```
- [ ] 프로덕션 빌드
  ```bash
  pnpm build
  ```
- [ ] 빌드 에러 없음 확인
- [ ] 로컬에서 프로덕션 모드 테스트
  ```bash
  pnpm start
  ```

### 5. 보안 설정
- [ ] HTTPS 인증서 설정 (Let's Encrypt 등)
- [ ] CORS 설정 확인
- [ ] CSP(Content Security Policy) 헤더 설정
- [ ] Rate Limiting 설정 확인

### 6. 모니터링 및 로깅
- [ ] 에러 추적 서비스 설정 (Sentry 등)
- [ ] 로그 수집 설정
- [ ] 헬스체크 엔드포인트 확인 (`/api/health`)

### 7. 크롤러 서비스
- [ ] 크롤러 서비스 별도 배포 준비
- [ ] 크롤링 스케줄 확인 (기본: 6시간마다)
- [ ] Playwright 의존성 설치 확인
  ```bash
  cd apps/crawler
  pnpm playwright install chromium
  ```

### 8. 성능 최적화
- [ ] 이미지 최적화 설정 확인
- [ ] Redis 캐싱 동작 확인
- [ ] CDN 설정 (필요시)

### 9. 백업 및 복구
- [ ] 데이터베이스 백업 전략 수립
- [ ] 백업 자동화 스크립트 설정
- [ ] 복구 절차 문서화

### 10. 최종 확인
- [ ] 모든 환경 변수가 프로덕션 값으로 설정됨
- [ ] 개발용 디버그 모드 비활성화
- [ ] 민감한 정보가 코드에 하드코딩되지 않음
- [ ] robots.txt 및 sitemap.xml 설정
- [ ] 404, 500 에러 페이지 확인

## 배포 명령어

### Vercel 배포 (권장)
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod
```

### PM2를 사용한 자체 호스팅
```bash
# PM2 설치
npm i -g pm2

# 웹 서비스 시작
pm2 start npm --name "rebridge-web" -- start

# 크롤러 서비스 시작
pm2 start npm --name "rebridge-crawler" -- run start:crawler

# 프로세스 상태 확인
pm2 status

# 로그 확인
pm2 logs
```

### Docker 배포
```bash
# 이미지 빌드
docker build -t rebridge .

# 컨테이너 실행
docker run -d \
  --name rebridge \
  -p 3000:3000 \
  --env-file .env.production \
  rebridge
```

## 배포 후 확인 사항

- [ ] 홈페이지 정상 로딩
- [ ] 회원가입/로그인 기능 동작
- [ ] 채용공고 목록 표시
- [ ] 검색 기능 동작
- [ ] 공고 저장 기능 동작
- [ ] 크롤러 스케줄 동작 확인

## 롤백 절차

문제 발생 시:
1. 이전 버전으로 즉시 롤백
2. 에러 로그 수집 및 분석
3. 수정 후 재배포

---

📌 이 체크리스트를 배포 시마다 확인하여 안정적인 서비스 운영을 보장하세요.