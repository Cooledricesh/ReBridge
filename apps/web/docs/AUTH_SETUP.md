# 인증 시스템 설정 가이드

## 개요
ReBridge는 NextAuth.js v5 (Auth.js)를 사용하여 인증 시스템을 구현했습니다.

## 주요 기능
- 이메일/비밀번호 기반 로그인 (CredentialsProvider)
- JWT 기반 세션 관리 (30일 만료)
- bcrypt를 사용한 비밀번호 해싱 (salt rounds: 12)
- 미들웨어를 통한 보호된 경로 접근 제어

## 환경 변수 설정

```bash
# .env.local
NEXTAUTH_URL="http://localhost:3000"  # 프로덕션에서는 실제 도메인으로 변경
NEXTAUTH_SECRET="your-secret-key"     # openssl rand -base64 32 로 생성
DATABASE_URL="postgresql://..."       # PostgreSQL 연결 문자열
```

## 보안 체크리스트

### ✅ 구현된 보안 기능
- [x] bcrypt(12)를 사용한 안전한 비밀번호 해싱
- [x] JWT 토큰 기반 세션 (httpOnly 쿠키)
- [x] CSRF 보호 (NextAuth.js 내장)
- [x] 환경 변수를 통한 민감 정보 관리
- [x] 보호된 경로에 대한 미들웨어 검증

### 📋 프로덕션 배포 전 확인사항
1. **환경 변수**
   - [ ] `NEXTAUTH_SECRET` 강력한 랜덤 값으로 설정
   - [ ] `NEXTAUTH_URL` 실제 도메인으로 변경
   - [ ] 모든 환경 변수가 .env.local에만 있고 git에 포함되지 않았는지 확인

2. **HTTPS 설정**
   - [ ] 프로덕션 환경에서 HTTPS 적용
   - [ ] Secure 쿠키 설정 확인

3. **데이터베이스**
   - [ ] 프로덕션 데이터베이스 보안 설정
   - [ ] 연결 문자열 암호화

## API 엔드포인트

### 인증 관련 API
- `POST /api/auth/register` - 회원가입
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js 핸들러
- NextAuth.js 내장 엔드포인트:
  - `/api/auth/signin` - 로그인
  - `/api/auth/signout` - 로그아웃
  - `/api/auth/session` - 세션 확인

### 보호된 경로
- `/saved-jobs` - 저장한 채용공고
- `/profile` - 프로필 (추후 구현)
- `/settings` - 설정 (추후 구현)

## 사용 예시

### 회원가입
```typescript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: '홍길동',
    isRegisteredDisability: false
  })
})
```

### 로그인
```typescript
import { signIn } from 'next-auth/react'

const result = await signIn('credentials', {
  email: 'user@example.com',
  password: 'password123',
  redirect: false
})
```

### 로그아웃
```typescript
import { signOut } from 'next-auth/react'

await signOut({ callbackUrl: '/' })
```

### 세션 확인
```typescript
// 클라이언트 컴포넌트
import { useSession } from 'next-auth/react'
const { data: session, status } = useSession()

// 서버 컴포넌트
import { auth } from '@/lib/auth'
const session = await auth()
```

## 트러블슈팅

### 일반적인 문제
1. **로그인이 되지 않는 경우**
   - NEXTAUTH_URL이 올바르게 설정되었는지 확인
   - 쿠키가 차단되지 않았는지 확인

2. **세션이 유지되지 않는 경우**
   - NEXTAUTH_SECRET이 설정되었는지 확인
   - 브라우저 쿠키 설정 확인

3. **비밀번호 검증 실패**
   - bcrypt 해시가 올바르게 생성되었는지 확인
   - 데이터베이스의 password_hash 필드 확인