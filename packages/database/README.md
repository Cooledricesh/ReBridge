# Database Package

Prisma ORM을 사용한 데이터베이스 관리 패키지입니다.

## 설정

1. Docker로 PostgreSQL 실행:
```bash
docker-compose up -d postgres
```

2. 환경 변수 설정 (.env):
```
DATABASE_URL="postgresql://rebridge:rebridge_dev_password@localhost:5432/rebridge_dev?schema=public"
```

3. 마이그레이션 실행:
```bash
pnpm db:migrate
```

4. Prisma Client 생성:
```bash
pnpm db:generate
```

## 명령어

- `pnpm db:generate` - Prisma Client 생성
- `pnpm db:push` - 스키마를 DB에 직접 반영 (개발용)
- `pnpm db:migrate` - 마이그레이션 생성 및 적용
- `pnpm db:seed` - 시드 데이터 생성
- `pnpm db:studio` - Prisma Studio 실행

## 테스트

```bash
pnpm tsx test/db-connection.test.ts
```