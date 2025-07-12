# Code Guideline for ReBridge

## 1. Project Overview  
- Monorepo (pnpm workspaces) with:  
  - `apps/web` – Next.js 14 App Router (SSR/Server Components) + API Routes + GraphQL  
  - `apps/crawler` – Node.js + Puppeteer crawler service (Cron + BullMQ)  
  - `packages/database` – Prisma schema & client singleton  
  - `packages/shared` – shared types & utils  
  - `packages/crawler-adapters` – site-specific crawler logic  
- Data flow: Crawler → Zod parsing → Prisma → Upstash Redis (TTL cache, BullMQ queues) → Next.js API/GraphQL → Frontend  
- CI/CD: GitHub Actions → Vercel (Web/API), Neon PostgreSQL, Upstash Redis  
- Key patterns: Server Components for SEO/caching, cache-first queries, modular feature folders, strict error contracts  

## 2. Core Principles  
1. **Type Safety** – All exported functions/components MUST declare explicit TypeScript types.  
2. **Single Responsibility** – Modules/functions ≤ 200 LOC and address one concern.  
3. **Consistent Error Handling** – Wrap all async logic in `try/catch` and return standardized `ApiError`.  
4. **Resource Efficiency** – Batch DB writes and cache reads; measure with query-count metrics.  
5. **Modularity & Reuse** – Shared utilities and types MUST reside in shared packages; no duplication.

## 3. Language-Specific Guidelines

### 3.1 TypeScript & Next.js  
- File organization:  
  - `apps/web/app/feature-name/` containing `page.tsx`, `route.ts`, `Component.tsx`  
  - `components/` for UI atoms/molecules, `features/` for pages  
- Imports:  
  - Use absolute paths via `tsconfig.json` `baseUrl`/`paths`  
  - Avoid `../../../`; max two relative levels  
- Error handling:  
  - API routes/GraphQL resolvers MUST throw/return `ApiError({ status, code, message })`  
  - Use Next.js `error.js` boundaries for UI

### 3.2 Prisma & Database  
- Client: export a singleton `prisma` from `packages/database/client.ts`  
- Transactions: use `prisma.$transaction([...])` for atomic operations  
- Migrations:  
  - Dev: `pnpm prisma migrate dev --name <desc>`  
  - Prod: `pnpm prisma migrate deploy`

### 3.3 GraphQL  
- Schema in `packages/graphql/schema/`, resolvers in `packages/graphql/resolvers/`  
- Business logic resides in `services/` modules; resolvers delegate to services  
- Context must provide `{ prisma, user }`; propagate errors via `AuthenticationError` or `UserInputError`

### 3.4 Crawler (Node & Puppeteer)  
- Adapters extend `BaseCrawler` in `packages/crawler-adapters`  
- Schedule in `apps/crawler/src/scheduler.ts` using Cron + BullMQ (concurrency=4)  
- Enforce rate limits (2–5 s delay) and retries (max 3, exponential backoff)  
- Validate raw data with Zod before normalization

### 3.5 Redis & Caching  
- Key conventions:  
  - Lists: `jobs:latest`, `jobs:search:<query>`  
  - User: `user:<id>:saved-jobs`  
- Use `redis.setex(key, ttl, value)` for TTL  
- Use BullMQ for persistent queues; avoid raw Pub/Sub for critical flows

## 4. Code Style Rules

### MUST Follow  
- ESLint + Prettier: extend `next/core-web-vitals` & `prettier`  
- TS strict mode: `strict: true`, `noImplicitAny: true`  
- Validation: use Zod for all external inputs (API, crawler)  
- Naming: domain-driven, camelCase for variables/functions, PascalCase for types/components  
- JSDoc: all public APIs/classes MUST have a brief JSDoc

### MUST NOT Do  
- `console.log` in production; use `logger.info`/`logger.error` (pino)  
- Modules > 200 LOC or > 3 nested callback levels  
- Mix UI and business logic in the same file  
- Inline CSS/global styles; use CSS Modules or Tailwind

## 5. Architecture Patterns

### Component & Module Structure  
- Feature-based folders: `features/jobs/`, `features/user/`  
- Shared code: `packages/shared/` for hooks, types, util  
- Services: `services/jobService.ts`, `services/notificationService.ts`

### Data Flow Patterns  
- Crawler → Zod parse → Prisma write → Redis cache → API → Frontend  
- Cache-first: list/detail endpoints check Redis before DB

### State Management Conventions  
- Server Components for data fetching (SEO, caching)  
- Client Components only for interactive UI; use SWR or React Query for client cache

### API Design Standards  
- GraphQL for complex queries/mutations; REST only for webhooks (`/api/crawler/trigger`) and file uploads  
- Error response shape:  
  ```json
  { "error": { "code":"BAD_REQUEST", "message":"Invalid input", "details":{} } }
  ```

## 6. Example Code Snippets

```typescript
// MUST: Singleton Prisma client (packages/database/client.ts)
import { PrismaClient } from '@prisma/client';
const prisma = global.prisma ?? new PrismaClient();
if (process.env.NODE_ENV === 'development') global.prisma = prisma;
export default prisma;
```

```typescript
// MUST NOT: Instantiating PrismaClient per request
export async function handler(req, res) {
  const prisma = new PrismaClient(); // ❌ connection storm
  const jobs = await prisma.job.findMany();
  res.json(jobs);
}
```

```typescript
// MUST: Zod validation of crawler data
import { z } from 'zod';
const RawJobSchema = z.object({
  id: z.string(), title: z.string(), url: z.string(), raw: z.record(z.unknown())
});
export type RawJobData = z.infer<typeof RawJobSchema>;
```

```typescript
// MUST NOT: Using unvalidated raw data
const rawJobs: any[] = await crawler.crawl();
await prisma.job.createMany({ data: rawJobs }); // ❌ shape mismatch risk
```

```tsx
// MUST: Server Component with data fetch
export default async function JobsPage() {
  const jobs = await prisma.job.findMany({ orderBy: { crawledAt: 'desc' }, take:20 });
  return <JobList jobs={jobs} />;
}
```

```tsx
// MUST NOT: Client Component for static data
'use client';
export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  useEffect(() => fetch('/api/jobs').then(r => r.json()).then(setJobs));
  return <JobList jobs={jobs}/>;
}
```

```graphql
# MUST: Modular GraphQL schema (packages/graphql/schema/job.graphql)
type Job { id: ID! title: String! company: String }
```

```typescript
// MUST NOT: Business logic in resolver
const resolvers = {
  Query: {
    jobs: () => prisma.job.findMany() // ❌ move to jobService.fetchJobs()
  }
};
```

```typescript
// MUST: API error handling
export async function GET(request: Request) {
  try {
    const jobs = await getLatestJobs();
    return new Response(JSON.stringify(jobs), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: { code:'INTERNAL', message: err.message }}), { status:500 });
  }
}
```

```typescript
// MUST NOT: Uncaught errors in route
export async function GET(request: Request) {
  const jobs = await getLatestJobs(); // ❌ uncaught exceptions cause 500 without shape
  return new Response(JSON.stringify(jobs));
}
```

## 7. Testing Standards

### 7.1 Test Coverage Requirements
```typescript
// MUST: Minimum coverage targets
{
  "statements": 80,
  "branches": 75,
  "functions": 80,
  "lines": 80
}
```

### 7.2 Test File Structure
```typescript
// MUST: Co-locate tests with source files
src/
  components/
    JobCard.tsx
    JobCard.test.tsx    // Unit tests
    JobCard.stories.tsx // Storybook stories
```

### 7.3 Test Patterns
```typescript
// MUST: Use Testing Library best practices
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('should save job when save button clicked', async () => {
  const user = userEvent.setup();
  const onSave = jest.fn();
  
  render(<JobCard job={mockJob} onSave={onSave} />);
  
  await user.click(screen.getByRole('button', { name: /저장/i }));
  
  expect(onSave).toHaveBeenCalledWith(mockJob.id);
});

// MUST NOT: Test implementation details
test('should set state to true', () => {
  // ❌ Testing internal state instead of behavior
  expect(component.state.isSaved).toBe(true);
});
```

### 7.4 Crawler Testing
```typescript
// MUST: Mock external dependencies
import { mockPage } from '@/test-utils/mock-puppeteer';

beforeEach(() => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => mockJobData
  });
});

// MUST: Test error scenarios
test('should retry on network failure', async () => {
  mockPage.goto.mockRejectedValueOnce(new Error('Network error'));
  mockPage.goto.mockResolvedValueOnce();
  
  await crawler.crawl();
  
  expect(mockPage.goto).toHaveBeenCalledTimes(2);
});
```

## 8. Security Guidelines

### 8.1 Input Validation
```typescript
// MUST: Validate all user inputs
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100)
});

export async function POST(request: Request) {
  const body = await request.json();
  const validation = LoginSchema.safeParse(body);
  
  if (!validation.success) {
    return new Response(JSON.stringify({
      error: { code: 'VALIDATION_ERROR', details: validation.error.errors }
    }), { status: 400 });
  }
}

// MUST NOT: Trust user input
const query = `SELECT * FROM users WHERE email = '${req.body.email}'`; // ❌ SQL injection
```

### 8.2 Authentication & Authorization
```typescript
// MUST: Check permissions in API routes
import { getServerSession } from 'next-auth';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Check ownership
  const job = await prisma.savedJob.findFirst({
    where: { jobId: params.id, userId: session.user.id }
  });
  
  if (!job) {
    return new Response('Forbidden', { status: 403 });
  }
}
```

### 8.3 Sensitive Data Handling
```typescript
// MUST: Exclude sensitive fields
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    profile: true,
    // passwordHash: false, // Never expose
  }
});

// MUST: Use environment variables
const apiKey = process.env.CRAWLER_API_KEY!;
// MUST NOT: Hardcode secrets
const apiKey = 'sk-1234567890'; // ❌
```

## 9. Performance Guidelines

### 9.1 Database Optimization
```typescript
// MUST: Use select to limit fields
const jobs = await prisma.job.findMany({
  select: {
    id: true,
    title: true,
    company: true,
    // Exclude large description field for list views
  },
  take: 20
});

// MUST: Use pagination
const { page = 1, limit = 20 } = request.query;
const jobs = await prisma.job.findMany({
  skip: (page - 1) * limit,
  take: limit
});

// MUST NOT: Fetch all records
const allJobs = await prisma.job.findMany(); // ❌ Memory issues
```

### 9.2 Caching Strategy
```typescript
// MUST: Implement cache layers
export async function getLatestJobs() {
  // 1. Check Redis cache
  const cached = await redis.get('jobs:latest');
  if (cached) return JSON.parse(cached);
  
  // 2. Fetch from DB
  const jobs = await prisma.job.findMany({
    orderBy: { crawledAt: 'desc' },
    take: 100
  });
  
  // 3. Cache for 1 hour
  await redis.setex('jobs:latest', 3600, JSON.stringify(jobs));
  
  return jobs;
}

// MUST: Invalidate cache on updates
export async function createJob(data: JobInput) {
  const job = await prisma.job.create({ data });
  await redis.del('jobs:latest'); // Invalidate
  return job;
}
```

### 9.3 Image Optimization
```typescript
// MUST: Use Next.js Image component
import Image from 'next/image';

<Image
  src={company.logo}
  alt={`${company.name} 로고`}
  width={100}
  height={100}
  loading="lazy"
/>

// MUST NOT: Use unoptimized images
<img src={company.logo} /> // ❌
```

## 10. Logging Standards

### 10.1 Structured Logging
```typescript
// MUST: Use structured logging with context
import { logger } from '@/lib/logger';

logger.info('Job crawling completed', {
  source: 'workTogether',
  jobsFound: 150,
  jobsNew: 23,
  duration: 45000,
  timestamp: new Date().toISOString()
});

// MUST NOT: Use console.log
console.log('Found jobs:', jobs); // ❌
```

### 10.2 Log Levels
```typescript
// Log level usage:
logger.debug('Detailed debug info', { query, params }); // Development only
logger.info('Normal operations', { userId, action });   // General info
logger.warn('Warning conditions', { retries, delay });  // Potential issues
logger.error('Error occurred', { error, stack });       // Recoverable errors
logger.fatal('System failure', { error });              // Unrecoverable errors
```

### 10.3 Sensitive Data in Logs
```typescript
// MUST: Sanitize sensitive data
logger.info('User login', {
  email: user.email,
  // password: '***', // Never log passwords
  ip: request.ip
});

// MUST: Use log redaction
const sanitizedUser = {
  ...user,
  passwordHash: undefined,
  phoneNumber: user.phoneNumber?.replace(/\d(?=\d{4})/g, '*')
};
```

## 11. Accessibility Guidelines

### 11.1 Component Accessibility
```tsx
// MUST: Provide accessible markup
<button
  onClick={handleSave}
  aria-label={isSaved ? '저장 취소' : '공고 저장'}
  aria-pressed={isSaved}
>
  <Icon name={isSaved ? 'bookmark-filled' : 'bookmark'} />
</button>

// MUST: Use semantic HTML
<nav aria-label="채용 공고 페이지네이션">
  <ul role="list">...</ul>
</nav>

// MUST NOT: Use divs for interactive elements
<div onClick={handleClick}>클릭하세요</div> // ❌
```

### 11.2 Form Accessibility
```tsx
// MUST: Associate labels with inputs
<label htmlFor="email">이메일</label>
<input 
  id="email"
  type="email"
  required
  aria-describedby="email-error"
/>
{error && <span id="email-error" role="alert">{error}</span>}

// MUST: Provide keyboard navigation
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleSelect();
  }
}}
```

## 12. Version Control & Git

### 12.1 Branch Strategy
```bash
# Branch naming
main                    # Production
develop                 # Development
feature/job-search      # New features
fix/crawler-timeout     # Bug fixes
hotfix/security-patch   # Emergency fixes
```

### 12.2 Commit Messages
```bash
# Format: <type>(<scope>): <subject>
feat(jobs): add advanced search filters
fix(crawler): handle timeout errors
docs(readme): update installation steps
perf(api): optimize job query performance
test(auth): add login integration tests
```

### 12.3 Pre-commit Hooks
```json
// .husky/pre-commit
{
  "hooks": {
    "pre-commit": "lint-staged",
    "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
  }
}

// lint-staged.config.js
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.test.{ts,tsx}": ["jest --bail --findRelatedTests"]
}
```

## 13. Environment Management

### 13.1 Environment Variables
```typescript
// MUST: Type environment variables
// env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    REDIS_URL: string;
    NEXTAUTH_SECRET: string;
    CRAWLER_SECRET: string;
  }
}

// MUST: Validate at runtime
const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'NEXTAUTH_SECRET'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});
```

### 13.2 Secret Management
```bash
# .env.local (git ignored)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# .env.example (committed)
DATABASE_URL=postgresql://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379
```

## 14. Code Review Checklist

### Before Submitting PR
- [ ] All tests pass (`pnpm test`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Type checks pass (`pnpm type-check`)
- [ ] Coverage meets minimum requirements
- [ ] No console.log statements
- [ ] Sensitive data is not exposed
- [ ] Error handling is implemented
- [ ] Loading and error states are handled in UI
- [ ] Accessibility requirements are met
- [ ] Performance impact is considered

### Review Focus Areas
1. **Security**: Input validation, authentication, authorization
2. **Performance**: Query optimization, caching, lazy loading
3. **Error Handling**: Try-catch blocks, error boundaries, user feedback
4. **Code Quality**: Single responsibility, DRY principle, readability
5. **Testing**: Edge cases, error scenarios, integration points

## 15. Performance Monitoring

### 15.1 Web Vitals
```typescript
// MUST: Monitor Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify(metric);
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/analytics', body);
  }
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 15.2 API Performance
```typescript
// MUST: Add performance timing
export async function GET(request: Request) {
  const start = performance.now();
  
  try {
    const result = await fetchData();
    const duration = performance.now() - start;
    
    logger.info('API request completed', {
      path: request.url,
      duration,
      resultCount: result.length
    });
    
    return Response.json(result);
  } catch (error) {
    const duration = performance.now() - start;
    logger.error('API request failed', { error, duration });
    throw error;
  }
}
```