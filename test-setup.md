# ReBridge 테스트 환경 구축

## 1. 테스트 프레임워크 설정

### 단위 테스트 (Unit Tests)
- **프레임워크**: Vitest
- **대상**: 
  - 크롤러 어댑터
  - API 엔드포인트
  - 유틸리티 함수

### E2E 테스트 (End-to-End Tests)
- **프레임워크**: Playwright
- **대상**: 
  - 주요 사용자 시나리오
  - 크로스 브라우저 테스트

## 2. 테스트 구성

### 크롤러 테스트
```typescript
// packages/crawler-adapters/src/adapters/__tests__/saramin.test.ts
import { describe, it, expect } from 'vitest';
import { SaraminAdapter } from '../saramin';

describe('SaraminAdapter', () => {
  it('should parse job data correctly', async () => {
    // 테스트 구현
  });
});
```

### API 테스트
```typescript
// apps/web/src/app/api/__tests__/jobs.test.ts
import { describe, it, expect } from 'vitest';

describe('Jobs API', () => {
  it('should return paginated jobs', async () => {
    // 테스트 구현
  });
});
```

### E2E 테스트
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can sign up and login', async ({ page }) => {
  // 테스트 구현
});
```

## 3. 테스트 실행 스크립트

```json
{
  "scripts": {
    "test": "turbo test",
    "test:unit": "vitest",
    "test:e2e": "playwright test",
    "test:coverage": "vitest --coverage"
  }
}
```

## 4. CI/CD 통합

GitHub Actions 워크플로우:
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test
```