# 🔧 ReBridge 환경변수 설정 가이드

## 필수 환경변수 (반드시 설정해야 함)

### 1. **데이터베이스 설정**
```bash
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
```
- **로컬 개발**: `postgresql://rebridge:rebridge_dev_password@localhost:5432/rebridge_dev?schema=public`
- **프로덕션**: 실제 PostgreSQL 데이터베이스 URL 사용
- **Neon.tech 예시**: `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/rebridge?sslmode=require`

### 2. **Redis 설정**
```bash
REDIS_URL="redis://localhost:6379"
```
- **로컬 개발**: Docker로 실행 중인 Redis 사용
- **프로덕션 (Upstash)**: 
  ```bash
  REDIS_URL="redis://default:password@host:port"
  UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
  UPSTASH_REDIS_REST_TOKEN="your-token"
  ```

### 3. **NextAuth 설정** ⚠️ 매우 중요
```bash
# 개발환경
NEXTAUTH_URL="http://localhost:3000"

# 프로덕션 (실제 도메인으로 변경)
NEXTAUTH_URL="https://rebridge.kr"

# 비밀키 생성 (아래 명령어 실행)
NEXTAUTH_SECRET="생성된-32바이트-문자열"
```

**비밀키 생성 방법**:
```bash
openssl rand -base64 32
```
또는 Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. **애플리케이션 URL**
```bash
# 프론트엔드 URL (클라이언트에서 사용)
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # 개발
NEXT_PUBLIC_APP_URL="https://rebridge.kr"    # 프로덕션
```

## 선택적 환경변수

### 5. **카카오 OAuth 설정** (소셜 로그인 사용 시)
```bash
KAKAO_CLIENT_ID="your-kakao-app-key"
KAKAO_CLIENT_SECRET="your-kakao-app-secret"
```

**카카오 개발자 설정**:
1. [카카오 개발자](https://developers.kakao.com) 접속
2. 애플리케이션 생성
3. 플랫폼 > Web 사이트 도메인 추가
4. 카카오 로그인 > 활성화
5. Redirect URI 추가:
   - 개발: `http://localhost:3000/api/auth/callback/kakao`
   - 프로덕션: `https://rebridge.kr/api/auth/callback/kakao`

### 6. **이메일 설정** (알림 기능 사용 시)
```bash
# SMTP 설정 (Gmail 예시)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="app-specific-password"
SMTP_FROM="ReBridge <noreply@rebridge.kr>"
```

**Gmail 앱 비밀번호 생성**:
1. Google 계정 설정 > 보안
2. 2단계 인증 활성화
3. 앱 비밀번호 생성

### 7. **모니터링 설정** (선택)
```bash
# Sentry (에러 추적)
SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"

# Slack (알림)
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/xxx/xxx/xxx"
```

### 8. **크롤러 설정**
```bash
# 크롤링 주기 (시간 단위, 기본값: 6)
CRAWL_INTERVAL_HOURS="6"

# 동시 실행 워커 수 (기본값: 4)
CRAWL_CONCURRENT_WORKERS="4"
```

## 환경별 설정 파일

### 개발 환경 (.env.local)
```bash
# 개발 환경 전체 예시
DATABASE_URL="postgresql://rebridge:rebridge_dev_password@localhost:5432/rebridge_dev?schema=public"
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="개발용-임시-시크릿-키-32바이트"
```

### 프로덕션 환경 (.env.production)
```bash
# 프로덕션 환경 전체 예시
DATABASE_URL="postgresql://user:pass@production-db-host/rebridge?sslmode=require"
REDIS_URL="redis://default:password@redis-host:6379"
NEXT_PUBLIC_APP_URL="https://rebridge.kr"
NEXTAUTH_URL="https://rebridge.kr"
NEXTAUTH_SECRET="프로덕션-시크릿-키-반드시-강력하게"
```

## 환경변수 설정 확인

1. **필수 변수 확인 스크립트**:
```bash
# check-env.js 생성
const required = [
  'DATABASE_URL',
  'REDIS_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET'
];

const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('❌ 필수 환경변수가 설정되지 않았습니다:');
  missing.forEach(key => console.error(`  - ${key}`));
  process.exit(1);
} else {
  console.log('✅ 모든 필수 환경변수가 설정되었습니다!');
}
```

2. **실행**:
```bash
node check-env.js
```

## Vercel 배포 시 설정

1. Vercel 대시보드 > Settings > Environment Variables
2. 위의 모든 환경변수 추가
3. Preview와 Production 환경 구분하여 설정

## 주의사항

- ⚠️ **절대 .env 파일을 Git에 커밋하지 마세요**
- ⚠️ **NEXTAUTH_SECRET은 반드시 강력한 랜덤 값 사용**
- ⚠️ **프로덕션 DATABASE_URL은 SSL 연결 사용 권장**
- ⚠️ **민감한 정보는 환경변수로만 관리**

## 문제 해결

### "NEXTAUTH_NO_SECRET" 에러
- NEXTAUTH_SECRET이 설정되지 않았습니다
- 위의 명령어로 시크릿 생성 후 설정

### 데이터베이스 연결 실패
- DATABASE_URL 형식 확인
- 네트워크 연결 확인
- 데이터베이스 서버 상태 확인

### Redis 연결 실패
- Redis 서버 실행 확인: `docker ps | grep redis`
- REDIS_URL 형식 확인