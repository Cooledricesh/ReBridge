# ReBridge Web Application

장애인 구직자를 위한 통합 구인 정보 플랫폼의 웹 애플리케이션입니다.

## 기술 스택

- **Framework**: Next.js 15.1.0 (App Router)
- **UI**: React 19, Tailwind CSS, Shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **State Management**: Zustand, TanStack Query
- **Authentication**: NextAuth.js v5
- **Animation**: GSAP, Three.js, Framer Motion

## 환경 설정

1. `.env.local` 파일을 생성하고 필요한 환경 변수를 설정합니다:

```bash
cp .env.example .env.local
```

2. 필수 환경 변수:
   - `DATABASE_URL`: PostgreSQL 연결 문자열
   - `REDIS_URL`: Redis 연결 문자열
   - `NEXTAUTH_URL`: 인증 URL
   - `NEXTAUTH_SECRET`: NextAuth 비밀 키 (openssl rand -base64 32로 생성)

## 개발 환경 실행

```bash
# 의존성 설치
pnpm install

# Prisma 클라이언트 생성
pnpm prisma generate

# 개발 서버 실행
pnpm dev
```

## 프로덕션 빌드

```bash
# 빌드
pnpm build

# 프로덕션 실행
pnpm start
```

## Vercel 배포

1. Vercel CLI 설치:
```bash
npm i -g vercel
```

2. Vercel 프로젝트 연결:
```bash
vercel
```

3. 환경 변수 설정:
   - Vercel 대시보드에서 프로젝트 설정으로 이동
   - Environment Variables 섹션에서 필요한 환경 변수 추가

4. 배포:
```bash
vercel --prod
```

## 주요 기능

- 사람인, Work24, JobKorea 등 여러 구인 사이트 통합 검색
- 장애인 친화 구인공고 필터링
- 구인공고 저장 및 관리
- 반응형 디자인
- 다크 모드 지원
- 3D 인터랙티브 메인 페이지

## 프로젝트 구조

```
src/
├── app/              # Next.js App Router 페이지
├── components/       # React 컴포넌트
│   ├── ui/          # Shadcn/ui 기본 컴포넌트
│   └── three/       # Three.js 3D 컴포넌트
├── features/        # 기능별 모듈
├── hooks/           # 커스텀 React 훅
└── lib/            # 유틸리티 함수 및 설정
```