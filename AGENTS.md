# Project Overview

**Resumemo** (Resume Ranker) is a monorepo application with:
- **Runtime**: Bun 1.3.6
- **Build System**: Turborepo
- **Frontend**: Vite + React 19, Tailwind CSS v4
- **Backend**: Elysia (Bun web framework)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Better Auth (email/password + Google/GitHub OAuth)

## Repository Structure

```
resumemo/
├── web/               # Vite React app (port 5000)
│   ├── src/pages/     # Route pages
│   ├── src/components/# React components (ui/ for shadcn-style)
│   ├── src/hooks/     # Custom React hooks
│   └── src/lib/       # Utilities, auth client
├── api/               # Elysia API server (port 8080)
│   └── src/
│       ├── index.ts   # Main entry point
│       └── lib/       # DB, auth, schema
├── packages/
│   └── shared/        # Shared types and Zod schemas
```

## Build/Lint/Test Commands

### Root Commands (run from repo root)
```bash
bun run dev              # Start all workspaces in dev mode
bun run build            # Build all packages
bun run lint             # Lint all packages
bun run start            # Start web + api (production)
bun run web              # Dev mode web only
bun run api              # Dev mode api only
bun run clean            # Clean all build artifacts and node_modules
```

### Web Commands
```bash
cd web
bun run dev              # Start dev server (port 5000)
bun run build            # Production build
bun run lint             # Run ESLint
```

### API Commands
```bash
cd api
bun run dev              # Watch mode development (port 8080)
bun run build            # Compile to standalone binary
bun run push             # Push Drizzle schema to database
bun run generate         # Generate Better Auth files
```

### Testing
No testing framework is currently configured. When adding tests:
- Prefer Vitest for Bun/TypeScript compatibility
- Place test files adjacent to source: `component.test.tsx`
- Run single test: `bun test path/to/file.test.ts`

## Code Style Guidelines

### Formatting (Biome)
- **Indentation**: Tabs (width: 2)
- **Organize imports**: Enabled (auto-sorted)
- Run `bun run lint` in web to lint

### TypeScript
- Strict mode enabled across all packages
- Use explicit typing for function parameters and return types
- Prefer `type` over `interface` for object types
- Export types alongside implementations

### Path Aliases
```typescript
// Web
import { cn } from "@/lib/utils"        // @/* -> web/src/*
import { db } from "~/lib/db"           // ~/* -> api/src/*
import { userSchema } from "@shared/schemas"  // @shared/* -> packages/shared/src/*
```

### Naming Conventions
| Entity | Convention | Example |
|--------|------------|---------|
| Files | kebab-case | `auth-provider.tsx`, `use-mobile.ts` |
| Components | PascalCase | `SignInForm`, `Button` |
| Hooks | camelCase with `use` prefix | `useIsMobile`, `useSession` |
| Functions | camelCase | `handleSubmit`, `onSubmit` |
| Constants | SCREAMING_SNAKE_CASE | `MOBILE_BREAKPOINT` |
| Types | PascalCase | `SignInFormValues`, `UserSchema` |
| Zod schemas | camelCase with `Schema` suffix | `userSchema` |

### Component Patterns
```typescript
// Client component with "use client" directive
"use client";

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  className?: string
}

export function MyComponent({ className }: Props) {
  const [state, setState] = useState(false)
  return <div className={cn("base-styles", className)}>...</div>
}
```

### UI Components (shadcn/ui pattern)
- Use CVA (class-variance-authority) for variants
- Wrap Radix primitives with Tailwind styling
- Export component + variants + types
- Use `cn()` utility for class merging (clsx + tailwind-merge)

### Forms
- Use React Hook Form with Zod validation
- Use `@hookform/resolvers` for schema integration
- Show loading state in submit buttons
- Use `toast` from sonner for feedback

### Error Handling
```typescript
// API calls with Better Auth
const { error } = await authClient.signIn.email({ email, password })
if (error) {
  toast.error(error.message ?? "Fallback error message")
  return
}

// Backend with Elysia
.macro({
  auth: {
    async resolve({ status, request: { headers } }) {
      const session = await auth.api.getSession({ headers })
      if (!session) return status(401, { message: "Unauthorized" })
      return { user: session.user, session: session.session }
    }
  }
})
```

### Database (Drizzle ORM)
- Use UUID v7 for primary keys: `uuid("id").$defaultFn(randomUUIDv7).primaryKey()`
- Always include timestamps with timezone: `timestamp("created_at", { withTimezone: true })`
- Add `$onUpdate(() => new Date())` for `updatedAt` columns
- Define indexes in table callback: `(table) => [index().on(table.userId)]`

### Backend API Pattern
```typescript
// Elysia with auth macro
const app = new Elysia()
  .use(betterAuth)
  .get("/api/me", ({ user, session }) => ({ user, session }), { auth: true })
```

### Imports Organization (auto-sorted by Biome)
1. External packages (react, next, etc.)
2. Internal packages (@shared/*)
3. Local aliases (@/, ~/)
4. Relative imports

## Important Patterns

### Authentication
- Frontend: Use `authClient` from `@/lib/auth`
- Backend: Use `{ auth: true }` macro on protected routes
- Export `type API = typeof app` for type-safe Eden client

### Styling
- Tailwind CSS v4 with CSS custom properties
- Dark mode via `next-themes` (class strategy)
- Use `cn()` for conditional classes

### State Management
- Zustand for global or shared client state
- TanStack Query for server state
- React Hook Form for form state

## File Creation Guidelines
- Place UI components in `web/src/components/ui/`
- Place feature components in `web/src/components/`
- Place hooks in `web/src/hooks/`, zustand stores in `web/src/stores/`
- Place shared types/schemas in `packages/shared/src/`
- Add new API routes in `api/src/index.ts`

## Repository Layout (Target)
```
web/                        # Vite React application
api/                        # ElysiaJS API server
packages/shared/            # Types and validation schemas
services/parser/            # NLP parsing pipeline (future)
services/scorer/            # ML scoring pipeline (future)
docs/                       # Project documentation
```


# Architecture and Structure Guidelines

## Project Summary
Recruiter-facing resume screening platform with AI-assisted ranking, search, export, and analytics. Built with NextJS for UI, ElysiaJS on Bun for API services, Postgres for data, and Drizzle ORM for typed persistence.

## Key Domains
- **Resume Intake**: upload, file storage, metadata tracking.
- **Parsing**: text extraction, structured candidate fields.
- **Scoring**: model scoring and explainability payloads.
- **Search/Filter**: role, skills, experience, education, signals.
- **Export**: CSV/JSON results aligned with filters.
- **History**: past screening sessions and dashboards.

## Operational Conventions
- Keep raw files immutable; derived data is versioned.
- Every score includes explanation metadata for auditability.
- Search filters must be deterministic and cached where possible.
- Candidate data never mutates historical screens.

## Architectural Principles
- Separate UI, API, and ML services for clean ownership and scaling.
- Keep parsing and ranking pipelines independent from core app logic.
- Optimize for explainability, auditability, and reproducibility.
- Favor modular, versioned services over monolith-only deployments.

## System Components
**Frontend (NextJS)**
- Recruiter UI for upload, search, scoring, and exports.
- Admin UI for roles, permissions, and configuration.
- Dashboard UI for pipeline metrics and historical review.

**Backend (ElysiaJS on Bun)**
- API gateway for auth, resume ingestion, and candidate data access.
- Parsing service interface (pipeline orchestration layer).
- Scoring service interface (model routing, weights, rule adjustments).

**Data Layer**
- Postgres for canonical data (candidates, roles, job postings, scores).
- Object storage for raw resumes.
- Drizzle ORM for typed schema and queries.

## Data Flow (General Idea, High Level)
1. Recruiter uploads resumes.
2. API stores file metadata + raw file pointer.
3. Parsing pipeline extracts structured data into Postgres.
4. Scoring pipeline generates scores and explanations.
5. UI queries and filters candidate data and exports results.

## Extensibility Notes
- Parsing/scoring services can start as stub modules and later evolve.
- Version scoring models and track which model produced each score.
- Reserve room for implementing and integrating AI service once ML pipeline begins.
