## CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReBridge is a comprehensive job search platform specifically designed for people with mental disabilities in South Korea. It aggregates job postings from multiple Korean job sites (WorkTogether, Saramin, Work24, JobKorea) to provide a unified, accessible search experience.

## Monorepo Architecture

This is a **Turborepo + pnpm workspace** monorepo with the following structure:

```
ReBridge/
├── apps/
│   ├── web/                 # Next.js 15.1.0 main web application
│   └── crawler/             # Background job scraping service
├── packages/
│   ├── shared/              # Common types, utilities, constants
│   ├── database/            # Prisma schema and database client
│   └── crawler-adapters/    # Site-specific scraping adapters
└── test-app/               # Standalone test application
```

## Commands

### Root Level (Turborepo)
- `npm run dev` - Start all services (web + crawler)
- `npm run dev:web` - Start only web service (`turbo dev --filter=@rebridge/web`)
- `npm run dev:crawler` - Start only crawler service (`turbo dev --filter=@rebridge/crawler`)
- `npm run build` - Production build all packages
- `npm run start` - Start production server (web only)
- `npm run start:all` - Start all production services
- `npm run lint` - ESLint all packages
- `npm run typecheck` - TypeScript checking all packages
- `npm run test` / `npm run test:unit` / `npm run test:e2e` - Run tests
- `npm run format` - Format with Prettier
- `npm run clean` - Clean all build artifacts and node_modules
- `npm run check-env` - Validate environment variables

### Web App Specific (apps/web)
- `pnpm dev` - Next.js dev server
- `pnpm build` - Build with Prisma generation (`prisma generate && next build`)
- `pnpm start` - Start production Next.js server
- `pnpm worker:notification` - Background notification worker

### Crawler Specific (apps/crawler)
- `pnpm dev` - Watch mode with tsx (`tsx watch src/index.ts`)
- `pnpm crawl` - Manual crawl execution (`tsx src/index.ts`)
- `pnpm build` - TypeScript compilation
- `pnpm start` - Start compiled crawler

### Database Operations
- `cd apps/web && npx prisma generate` - Generate Prisma client
- `cd apps/web && npx prisma migrate dev` - Run database migrations
- `cd apps/web && npx prisma studio` - Database GUI explorer

### Infrastructure
- `docker-compose up -d` - Start PostgreSQL + Redis containers
- `pm2 start ecosystem.config.js` - Start services with PM2 (production)
- `pm2 logs` - View service logs
- `pm2 status` - Check service status

## Critical Database Naming Convention

### Dual Naming Strategy (IMPORTANT)
- **Database level**: `snake_case` (PostgreSQL standard)
- **Application level**: `camelCase` (JavaScript/TypeScript standard)
- **Mapping**: Prisma `@map` annotations bridge the two

```prisma
model User {
  id                     String   @id @default(uuid())
  passwordHash           String   @map("password_hash")
  isRegisteredDisability Boolean  @default(false) @map("is_registered_disability")
  createdAt              DateTime @default(now()) @map("created_at")
  updatedAt              DateTime @updatedAt @map("updated_at")
  
  @@map("users")  // Table name is snake_case
}
```

**Rationale**: Maintains PostgreSQL conventions at DB level while following JavaScript conventions in application code.

## Technology Stack

### Frontend (apps/web)
- **Framework**: Next.js 15.1.0 with App Router + Turbopack
- **UI**: React 19.0.0, Tailwind CSS, Shadcn/ui components
- **State Management**: Zustand (global), TanStack Query v5 (server state)
- **Forms**: React Hook Form + Zod validation
- **Animation**: GSAP, Three.js, Framer Motion for interactive elements
- **Auth**: NextAuth.js v5 (credentials + Kakao OAuth)
- **TypeScript**: 5.x with relaxed settings (strictNullChecks: false, noImplicitAny: false)

### Backend Infrastructure
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache/Queue**: Redis + BullMQ for job processing
- **Web Scraping**: Playwright + Puppeteer (requires `npx playwright install`)
- **Process Management**: PM2 for production deployment
- **Container**: Docker Compose for local development

### Web App Structure (apps/web/src)
```
src/
├── app/                    # Next.js App Router pages and layouts
│   ├── providers.tsx      # React Query & Theme providers
│   ├── globals.css        # Global styles with CSS variables
│   └── api/               # API routes
├── components/
│   ├── ui/                # Shadcn/ui components
│   ├── three/             # Three.js 3D components
│   └── auth-button.tsx    # Shared components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities (utils.ts, auth.ts, prisma.ts)
├── middleware.ts          # Next.js middleware for auth/rate limiting
└── types/                 # TypeScript type definitions
```

### Crawler Architecture (apps/crawler)
- **Job Sources**: WorkTogether, Saramin, Work24, JobKorea
- **Scheduling**: Cron-based execution every 6 hours (`0 */6 * * *`)
- **Queue Management**: BullMQ with Redis backend
- **Retry Logic**: 3 attempts with exponential backoff
- **Monitoring**: Built-in failure rate tracking and alerting

## Development Guidelines

### Code Standards (from .cursor/rules/global.mdc)
1. **Always use client components** - Add `'use client'` directive to all components
2. **Page params are promises** - Use `const params = await props.params` in page.tsx
3. **Functional programming approach** - Prefer pure functions, avoid mutations
4. **Early returns over nested conditionals**
5. **Use descriptive names** - Self-documenting code over comments
6. **DRY principle** - Don't repeat yourself
7. **Composition over inheritance**

### Required Libraries
- `date-fns` - Date/time handling
- `ts-pattern` - Type-safe pattern matching
- `@tanstack/react-query` - Server state management
- `zustand` - Global state management
- `react-use` - Common React hooks
- `es-toolkit` - Utility functions (instead of lodash)
- `lucide-react` - Icons
- `zod` - Schema validation
- `shadcn-ui` - UI components
- `react-hook-form` - Form handling

### Component Patterns
- Shadcn/ui components are in `components/ui/`
- Use picsum.photos for placeholder images
- Dark mode support via next-themes
- Responsive design for mobile/tablet/desktop

### TypeScript Configuration
- Path alias: `@/*` maps to `./src/*`
- Relaxed type checking enabled for faster development
- Some ESLint TypeScript rules disabled for pragmatic development

## Environment Setup

### Critical Environment Variables
```bash
DATABASE_URL="postgresql://rebridge:rebridge_dev_password@localhost:5432/rebridge_dev?schema=public"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[generate with: openssl rand -base64 32]"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Local Development Setup
1. Install dependencies: `pnpm install`
2. Start infrastructure: `docker-compose up -d`
3. Generate Prisma client: `cd apps/web && npx prisma generate`
4. Run migrations: `cd apps/web && npx prisma migrate dev`
5. Install Playwright browsers: `cd packages/crawler-adapters && npx playwright install`
6. Start development: `npm run dev`

### Production Deployment
- **Frontend**: Vercel (optimal for Next.js)
- **Database**: Neon.tech (serverless PostgreSQL)
- **Cache**: Upstash Redis (serverless)
- **Crawler**: Railway workers or containerized deployment

## Package Manager
- **Primary**: pnpm (monorepo with workspaces)
- **Node.js**: >=18.0.0 required
- **Alternative**: npm (supported but pnpm preferred)

## Known Issues and Critical Solutions

### 1. Next.js Dev Server Not Starting
**Primary Issue**: Prisma client not generated in monorepo structure

**Symptoms**: 
- Shows "Ready in Xms" but localhost:3000 returns ERR_CONNECTION_REFUSED
- No error messages in console
- Server appears to start but doesn't listen on port

**Solution**:
```bash
cd apps/web
npx prisma generate
```

**Other Debugging Steps**:
1. Check CSS files - `@import` must be at top of file before any other rules
2. Verify all required files exist in src/app/ (layout.tsx, globals.css)
3. Remove middleware.ts if not needed
4. Try without Turbopack: `npx next dev` (remove --turbopack flag)

### 2. Crawler Failures
**Common Issue**: Playwright browsers not installed

**Solution**:
```bash
cd packages/crawler-adapters
npx playwright install
apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 libatspi2.0-0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2
```

### 3. CSS Import Rules (Critical)
**Problem**: Placing `@import` inside `@layer` blocks causes silent build failures

**Correct structure in globals.css**:
```css
@import url('https://fonts.googleapis.com/...'); /* MUST be first */

@tailwind base;
@tailwind components; 
@tailwind utilities;

@layer base {
  /* Other styles here */
}
```

### 4. Process Management for Production
**Issue**: Development servers don't persist in production environments

**Solution**: Use PM2 for process management
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### 5. Environment Variable Issues
**Common Missing Variables**:
- `DATABASE_URL` - Required for Prisma
- `REDIS_URL` - Required for BullMQ
- `NEXTAUTH_SECRET` - Required for NextAuth.js

**Generate NextAuth Secret**:
```bash
openssl rand -base64 32
```

## Database Schema Constraints

- **NEVER change snake_case to camelCase** in database schema
- Always use Prisma `@map` annotations for field and table mapping
- Database follows PostgreSQL naming conventions (snake_case)
- Application code follows JavaScript conventions (camelCase)

## Korean Language Support

- All text must support UTF-8 encoding
- Test Korean characters after code generation for proper encoding
- Remote images allowed from all hostnames for Korean content

## Additional Resources

Reference the following documentation files for detailed guidance:
- ENV_SETUP_GUIDE.md - Comprehensive environment setup
- README.md - Project overview and quick start
- .cursor/rules/global.mdc - Development standards and patterns