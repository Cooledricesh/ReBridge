# Crawler Service

채용 정보를 수집하는 크롤러 서비스입니다.

## 기능

- WorkTogether, Saramin 등 여러 채용 사이트 크롤링
- 6시간마다 자동 실행
- Redis를 통한 작업 큐 관리
- 중복 체크 및 데이터 정규화
- 재시도 로직 (최대 3회)

## 실행 방법

1. 환경 변수 설정:
```bash
export DATABASE_URL="postgresql://rebridge:rebridge_dev_password@localhost:5432/rebridge_dev?schema=public"
export REDIS_URL="redis://localhost:6379"
```

2. 의존성 설치:
```bash
pnpm install
```

3. 크롤러 실행:
```bash
pnpm crawl
```

## 개발 모드

```bash
pnpm dev
```

## 프로덕션 빌드

```bash
pnpm build
pnpm start
```

## 크롤링 주기

- 기본: 6시간마다 실행 (cron: `0 */6 * * *`)
- 처음 실행 시 즉시 크롤링 시작

## 지원 사이트

- WorkTogether (워크투게더) - 장애인 채용 전문
- Saramin (사람인) - 장애인 채용 검색

## 모니터링

크롤링 로그는 `crawl_logs` 테이블에서 확인할 수 있습니다.