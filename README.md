# ReBridge - 정신장애인을 위한 통합 채용정보 플랫폼

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.1.0-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Prisma-5.7.0-2D3748?style=for-the-badge&logo=prisma" />
</p>

## 📋 프로젝트 개요

ReBridge는 정신장애인의 구직 활동을 지원하기 위한 통합 채용정보 플랫폼입니다. 여러 채용 사이트에 분산된 장애인 채용공고를 한 곳에서 쉽게 찾아볼 수 있도록 도와줍니다.

### 주요 기능

- 🔍 **통합 검색**: WorkTogether, 사람인, 고용24, 잡코리아의 장애인 채용공고 통합 검색
- 🎯 **맞춤형 필터링**: 지역, 고용형태, 급여 등 다양한 조건으로 필터링
- ♿ **접근성 최적화**: 정신장애인을 위한 직관적이고 단순한 UI/UX
- 🔄 **실시간 크롤링**: 6시간마다 자동으로 최신 채용정보 업데이트
- 📱 **반응형 디자인**: 모바일, 태블릿, 데스크톱 모든 환경 지원

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 15.1.0 (App Router)
- **UI Library**: React 19.0.0
- **Styling**: TailwindCSS + Shadcn/ui
- **State Management**: Zustand, TanStack Query v5
- **Form Handling**: React Hook Form + Zod

### Backend
- **Database**: PostgreSQL + Prisma ORM
- **Caching**: Redis
- **Job Queue**: BullMQ
- **Web Scraping**: Playwright, Puppeteer

### DevOps
- **Monorepo**: Turborepo + pnpm workspace
- **Container**: Docker Compose
- **Type Safety**: TypeScript 5.0

## 🚀 시작하기

### 필수 요구사항

- Node.js 18.0.0 이상
- pnpm 8.0.0 이상
- Docker & Docker Compose
- PostgreSQL 15 이상
- Redis 7.0 이상

### 설치 및 실행

1. **레포지토리 클론**
```bash
git clone https://github.com/Cooledricesh/ReBridge.git
cd ReBridge
```

2. **의존성 설치**
```bash
pnpm install
```

3. **환경 변수 설정**
```bash
cp .env.example .env
# .env 파일을 열어 필요한 환경 변수 설정
```

4. **Docker 컨테이너 실행**
```bash
docker-compose up -d
```

5. **데이터베이스 마이그레이션**
```bash
pnpm db:migrate
pnpm db:seed
```

6. **개발 서버 실행**
```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인할 수 있습니다.

## 📁 프로젝트 구조

```
ReBridge/
├── apps/
│   ├── web/                # Next.js 웹 애플리케이션
│   └── crawler/            # 크롤러 서비스
├── packages/
│   ├── shared/             # 공통 타입 및 유틸리티
│   ├── database/           # Prisma 스키마 및 클라이언트
│   └── crawler-adapters/   # 사이트별 크롤러 어댑터
├── docker-compose.yml      # Docker 설정
├── turbo.json             # Turborepo 설정
└── pnpm-workspace.yaml    # pnpm workspace 설정
```

## 🤝 기여하기

프로젝트에 기여하고 싶으신 분들은 다음 절차를 따라주세요:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 문의

프로젝트 관련 문의사항이 있으시면 아래로 연락주세요:

- **GitHub Issues**: [https://github.com/Cooledricesh/ReBridge/issues](https://github.com/Cooledricesh/ReBridge/issues)

---

<p align="center">Made with ❤️ for people with mental disabilities</p>