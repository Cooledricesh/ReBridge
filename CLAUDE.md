# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with Turbopack
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
- Package manager: npm (not yarn or pnpm)
- All text must support UTF-8 (Korean language)
- Remote images allowed from all hostnames
- ESLint configured with some TypeScript rules disabled
- Development server runs on default port 3000





<vooster-docs>
- @vooster-docs/prd.md
- @vooster-docs/architecture.md
- @vooster-docs/guideline.md
- @vooster-docs/step-by-step.md
- @vooster-docs/clean-code.md
- @vooster-docs/git-commit-message.md
</vooster-docs>