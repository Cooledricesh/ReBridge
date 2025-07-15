## CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Prisma Naming Convention (IMPORTANT - 최종 결정)

### DB와 코드의 명명 규칙 분리
- **DB 스키마**: snake_case (PostgreSQL 표준)
- **TypeScript/JavaScript 코드**: camelCase (JS/TS 표준)
- **매핑**: Prisma의 `@map` 어노테이션으로 연결

### 예시:
```prisma
model User {
  id                     Int      @id @default(autoincrement())
  passwordHash           String   @map("password_hash")        // DB: password_hash, 코드: passwordHash
  isRegisteredDisability Boolean  @default(false) @map("is_registered_disability")
  createdAt              DateTime @default(now()) @map("created_at")
  updatedAt              DateTime @updatedAt @map("updated_at")
  
  @@map("users")  // 테이블명은 snake_case
}
```

### 이유:
1. DB 레벨에서는 PostgreSQL 표준인 snake_case 유지
2. 애플리케이션 코드에서는 JavaScript/TypeScript 표준인 camelCase 사용
3. 더 이상 혼란 없이 양쪽 표준을 모두 만족
4. Prisma 외의 도구나 raw SQL 사용 시에도 문제 없음

## Commands

### Development
- `npm run dev` - Start all services (web + crawler)
- `npm run dev:web` - Start only the web service
- `npm run dev:crawler` - Start only the crawler service
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### EasyNext CLI Commands
- `npx easynext language` - Switch language settings
- `npx easynext supabase` - Configure Supabase integration
- `npx easynext next-auth` - Setup authentication
- `npx easynext google-analytics` - Add Google Analytics
- `npx easynext clarity` - Add Microsoft Clarity
- `npx easynext channeltalk` - Add Channel.io
- `npx easynext sentry` - Configure Sentry error tracking
- `npx easynext adsense` - Setup Google AdSense

## Architecture

This is a Next.js 15.1.0 project using App Router with a feature-based modular architecture:

### Key Technologies
- **Framework**: Next.js 15.1.0 with Turbopack
- **UI**: React 19, Tailwind CSS, Shadcn/ui components
- **State**: Zustand (global), TanStack Query v5 (server)
- **Forms**: React Hook Form + Zod validation
- **TypeScript**: Relaxed settings (strictNullChecks: false, noImplicitAny: false)

### Project Structure
```
src/
├── app/                    # Next.js pages and layouts
│   ├── providers.tsx      # React Query & Theme providers
│   └── globals.css        # Global styles with CSS variables
├── components/ui/         # Shadcn/ui components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities (utils.ts, query-keys.ts)
└── features/              # Feature modules pattern
    └── [feature]/
        ├── components/
        ├── hooks/
        └── api.ts
```

### Development Guidelines
1. **Always use client components** - Add `'use client'` directive to all components
2. **Page params are promises** - Use `const params = await props.params` in page.tsx
3. **Use functional programming** - Prefer pure functions, avoid mutations
4. **Follow existing patterns** - Check similar files before implementing new features
5. **Use provided utilities**:
   - `cn()` for className merging
   - `date-fns` for dates
   - `es-toolkit` for utilities
   - `ts-pattern` for pattern matching

### Component Patterns
- Shadcn/ui components are in `components/ui/`
- Use Lucide React for icons
- Use next-themes for dark mode
- Use picsum.photos for placeholder images

### API and Data Fetching
- Use TanStack Query for server state
- Define query keys in `lib/query-keys.ts`
- Use Axios for HTTP requests
- Handle errors with React Error Boundaries

### Styling
- Tailwind CSS with custom CSS variables
- Dark mode support via next-themes
- Custom colors defined in CSS variables (see globals.css)
- Animation utilities configured in tailwind.config.ts

### TypeScript Configuration
- Path alias: `@/*` maps to `./src/*`
- Relaxed type checking enabled
- Use type inference where possible
- Define interfaces for complex types

## Important Notes
- Package manager: pnpm (monorepo with pnpm workspaces)
- All text must support UTF-8 (Korean language)
- Remote images allowed from all hostnames
- ESLint configured with some TypeScript rules disabled
- Development server runs on default port 3000
- Database: PostgreSQL (via Docker) with Prisma ORM
- Cache: Redis (via Docker)
- Monorepo structure with Turborepo

## Critical CSS Rules
### ⚠️ @import MUST be at the top of CSS files
- **Problem**: Placing `@import` inside `@layer` blocks or after other rules causes Next.js build to silently fail
- **Symptom**: Server shows "Ready" but doesn't actually listen on port (ERR_CONNECTION_REFUSED)
- **Solution**: Always place `@import` statements at the very beginning of CSS files, before any other rules

Example of **CORRECT** structure in `globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=...'); /* MUST be first */

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* Other styles here */
}
```

## Known Issues and Solutions

### 1. Next.js Dev Server Not Starting
**Symptoms**: 
- Shows "Ready in Xms" but localhost:3000 returns ERR_CONNECTION_REFUSED
- No error messages in console
- `netstat` shows port is not listening

**Common Causes**:
1. CSS parsing errors (especially @import placement)
2. Missing required files (globals.css, layout.tsx)
3. Invalid middleware configuration
4. **Prisma Client not generated** (most common in monorepo)

**Debugging Steps**:
1. **Run `npx prisma generate` in apps/web directory** - This is often the solution
2. Check CSS files for @import placement
3. Verify all required files exist in src/app/
4. Remove any middleware.ts file if not needed
5. Try running without Turbopack: `npx next dev` (without --turbopack)

**Prisma-specific Solution (2025-07-13)**:
- Issue: Monorepo structure can cause Prisma client generation to fail silently
- Solution: 
  ```bash
  cd apps/web
  npx prisma generate
  ```
- Prevention: Consider adding to postinstall script in package.json

### 2. Merged App Directories
- Original structure had two app directories: `apps/web/app/` and `apps/web/src/app/`
- These were merged with `src/app/` as the final location
- This is the correct Next.js 13+ App Router structure

## Terminal Session and Server Management

### Server Termination and Session Challenges
- 서버가 계속 죽으면 터미널 세션 문제를 놓쳤네요.
- 사용하는 도구의 특성으로 인한 문제:
  - 서버를 시작하면 백그라운드로 유지되지 않고 바로 종료됨
  - timeout이 발생하면 프로세스가 강제 종료됨
- "Ready"라고 표시되다가 죽는 현상은 이러한 세션 관리 문제 때문임

## Schema Management
- 이제 스키마는 무조건 Snake case이며 절대 camel case로 변경은 하지 않는다.

<vooster-docs>
- @vooster-docs/prd.md
- @vooster-docs/architecture.md
- @vooster-docs/guideline.md
- @vooster-docs/step-by-step.md
- @vooster-docs/clean-code.md
- @vooster-docs/git-commit-message.md
</vooster-docs>