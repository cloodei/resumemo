## Project Overview

**Resumemo** is a recruiter-facing resume screening platform with AI-assisted ranking, search, and export capabilities.

### Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Bun 1.3.6 |
| **Build System** | Turborepo |
| **Frontend** | Vite + React 19 + React Router DOM |
| **Styling** | Tailwind CSS v4 |
| **Backend** | ElysiaJS (Bun web framework) |
| **Database** | PostgreSQL with Drizzle ORM |
| **Auth** | Better Auth (email/password + Google/GitHub OAuth) |
| **AI Pipeline** | Python 3.12+ with Celery, spaCy, scikit-learn |
| **Message Queue** | RabbitMQ (CloudAMQP in production) |
| **Storage** | Cloudflare R2 (S3-compatible) |

### Status

> ⚠️ **Early Development**: The AI pipeline and core features are functional but undergoing active iteration. Expect breaking changes.

---

## Repository Structure

```
resumemo/
├── web/                          # Vite React app (port 5000)
│   ├── src/
│   │   ├── pages/                # Route page components
│   │   ├── components/           # React components
│   │   │   └── ui/               # shadcn-style UI primitives
│   │   ├── hooks/                # Custom React hooks
│   │   ├── stores/               # Zustand stores
│   │   ├── lib/                  # Utilities, API client, auth
│   │   ├── routes/               # Route definitions
│   │   └── layouts/              # Layout components
│   └── vite.config.ts            # Uses rolldown-vite (Rust bundler)
│
├── api/                          # Elysia API server (port 8080)
│   ├── src/
│   │   ├── index.ts              # Main entry, route composition
│   │   ├── routes/               # HTTP routes by domain
│   │   │   ├── sessions/         # Profiling session endpoints
│   │   │   ├── files.ts          # File upload endpoints
│   │   │   ├── pipeline.ts       # Internal callback endpoint
│   │   │   └── system.ts         # Health/auth endpoints
│   │   └── lib/                  # DB, auth, storage, utilities
│   └── drizzle.config.ts
│
├── packages/
│   └── shared/                   # Shared types and Zod schemas
│       └── src/
│           ├── schemas/          # Drizzle table definitions
│           ├── types/            # TypeScript type exports
│           └── constants/        # Shared constants
│
├── services/
│   └── pipeline/                 # Python AI pipeline
│       ├── pipeline/             # Core pipeline modules
│       │   ├── extract.py        # Text extraction (PDF, DOCX, TXT)
│       │   ├── parse.py          # NLP parsing (spaCy)
│       │   ├── score.py          # TF-IDF scoring
│       │   ├── summarize.py      # Template-based summaries
│       │   └── ...
│       ├── worker.py             # Celery worker entry
│       └── pyproject.toml
│
├── docs/                         # Human-readable documentation
├── docker-compose.yml            # Local RabbitMQ + pipeline worker
└── turbo.json                    # Turborepo task config
```

---

## Build/Lint/Test Commands

> **INFO**: Refrain from running direct tests/lints or build during code generation or development. They will be ran manually except explicitly being said to run. If so you can run these commands from the root directory.

### Root Commands

```bash
bun run dev              # Start web + api in dev mode
bun run build            # Build all packages
bun run lint             # Lint all packages
bun run start            # Production mode (web preview + api)
bun run web              # Dev mode web only
bun run api              # Dev mode api only
bun run clean            # Clean build artifacts and node_modules
```

### Web Commands

```bash
cd web
bun run dev              # Start dev server (port 5000)
bun run build            # Production build (tsc + vite)
bun run lint             # Run ESLint
bun run preview          # Preview production build
```

### API Commands

```bash
cd api
bun run dev              # Watch mode (port 8080)
bun run build            # Compile to standalone binary
bun run push             # Push Drizzle schema to database
bun run generate         # Generate Better Auth files
```

### Pipeline Commands

```bash
cd services/pipeline

# Install (using uv)
uv sync/uv add

# Run worker locally
celery -A worker worker --loglevel=info --queues=profiling.jobs

# Or via Docker Compose (from repo root)
docker-compose up -d rabbitmq pipeline-worker
```

### Testing

No testing framework currently configured. When adding tests:
- Prefer Vitest for Bun/TypeScript compatibility
- Place test files adjacent to source: `component.test.tsx`
- Run: `bun test path/to/file.test.ts`

---

## Code Style Guidelines

### Formatting

- **Indentation**: Tabs (width: 2)
- **Imports**: Auto-sorted by ESLint
- **Lint**: Run `bun run lint` in web directory

### TypeScript

- Strict mode enabled across all packages
- Use explicit typing for function parameters and return types
- Prefer `type` over `interface` for object types
- Export types alongside implementations

### Path Aliases

```typescript
// Web (vite.config.ts)
import { cn } from "@/lib/utils"              // @/* -> web/src/*
import { userSchema } from "@shared/schemas"  // @shared/* -> packages/shared/src/*

// API (tsconfig paths)
import { db } from "~/lib/db"                 // ~/* -> api/src/*
import * as schema from "@shared/schemas"     // @shared/* -> packages/shared/src/*
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

---

## Frontend Patterns

### Routing (React Router DOM)

Routes are defined centrally in `web/src/routes/route-defs.tsx`:

```typescript
import { Routes, Route, Navigate } from "react-router-dom"

export const ROUTES = [
  { path: "/", element: <LandingPage />, layout: "none" },
  { path: "/dashboard", element: <DashboardPage />, layout: "app" },
  // ...
] as const

// In App.tsx
<Routes>
  {ROUTES.map((route) => (
    <Route key={route.path} path={route.path} 
      element={route.layout === "app" ? <AppLayout>{route.element}</AppLayout> : route.element}
    />
  ))}
</Routes>
```

### Components

```typescript
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  className?: string
  onSubmit?: () => void
}

export function MyComponent({ className, onSubmit }: Props) {
  const [state, setState] = useState(false)
  
  return (
    <div className={cn("base-styles", className)}>
      <Button onClick={onSubmit}>Submit</Button>
    </div>
  )
}
```

> **Note**: This is Vite + React, NOT Next.js. Do not use `"use client"` directives or Next.js-specific patterns.

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

```typescript
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

type FormValues = z.infer<typeof schema>

function MyForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
  })
  
  const onSubmit = async (data: FormValues) => {
    const { error } = await someApiCall(data)
    if (error) {
      toast.error(error.message ?? "Something went wrong")
      return
    }
    toast.success("Success!")
  }
  
  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>
}
```

### State Management

| Use Case | Solution |
|----------|----------|
| Server state | TanStack Query (via `@tanstack/react-query`) |
| Form state | React Hook Form |
| Global client state | Zustand (stores in `web/src/stores/`) |

### API Client (Eden Treaty)

Type-safe API client using Elysia's Eden:

```typescript
// web/src/lib/api.ts
import { treaty } from "@elysiajs/eden"
import type { API } from "@api"  // Type import from api

export const api = treaty<API>(BASE_URL, {
  fetch: { credentials: "include" },
  onResponse: (response) => {
    if (response.status === 401)
      window.location.href = "/login"
  },
})

// Usage
const { data, error } = await api.api.v2.sessions({ id }).get()
```

---

## Backend Patterns

### Elysia Routes

Routes are organized by domain in `api/src/routes/`:

```typescript
// api/src/routes/sessions/v2.ts
import { Elysia, t } from "elysia"

export const sessionRoutesV2 = new Elysia({ prefix: "/api/v2/sessions" })
  .get("/:id", async ({ params, user }) => {
    // Protected by auth macro
  }, { auth: true })
```

### Authentication

Backend uses Better Auth with a custom auth macro:

```typescript
// Routes requiring auth use { auth: true }
.get("/api/me", ({ user, session }) => ({ user, session }), { auth: true })

// Frontend uses authClient from better-auth
import { authClient } from "@/lib/auth"

const { data: session } = authClient.useSession()
await authClient.signIn.email({ email, password })
```

### Error Handling

```typescript
// Frontend API calls
const { data, error } = await api.some.endpoint.post({ body })
if (error) {
  toast.error(error.message ?? "Fallback error message")
  return
}

// Backend with Elysia
.post("/endpoint", async ({ body, status }) => {
  if (!valid) {
    return status(400, { message: "Invalid input" })
  }
  return { success: true }
})
```

### Database (Drizzle ORM)

Schemas are defined in `packages/shared/src/schemas/index.ts`:

```typescript
import { randomUUIDv7 } from "bun"
import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core"

export const user = pgTable("user", {
  id: uuid("id")
    .$defaultFn(randomUUIDv7)
    .primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index().on(table.name),
])
```

**Conventions:**
- Use UUID v7 for primary keys: `uuid("id").$defaultFn(randomUUIDv7).primaryKey()`
- Always include timestamps with timezone: `timestamp("created_at", { withTimezone: true })`
- Add `$onUpdate(() => new Date())` for `updatedAt` columns
- Define indexes in table callback

---

## AI Pipeline Integration

### Architecture Overview

```
┌─────────────┐     publish      ┌─────────────┐     consume     ┌──────────────┐
│  Elysia API │ ───────────────> │  RabbitMQ   │ ───────────────>│ Celery Worker│
│  (Bun/TS)   │                  │ (CloudAMQP) │                 │  (Python)    │
│             │<─────────────────│             │<────────────────│              │
└─────────────┘   HTTP callback  └─────────────┘                 └──────────────┘
       │                                                              │
       v                                                              v
┌─────────────┐                                              ┌──────────────┐
│  PostgreSQL │                                              │ Cloudflare R2│
└─────────────┘                                              └──────────────┘
```

### Flow

1. **Trigger**: `POST /api/v2/sessions/:id/start`
   - Validates session, sets status to `processing`
   - Creates `pipeline_job` row
   - Publishes job to RabbitMQ `profiling.jobs` queue

2. **Processing**: Celery worker receives job
   - Fetches files from R2
   - Extracts text (PDF/DOCX/TXT)
   - Parses with spaCy NER
   - Scores with TF-IDF + skill matching
   - Generates template-based summary

3. **Completion**: Worker POSTs to `/api/internal/pipeline/callback`
   - API validates shared secret
   - Stores `candidate_result` rows
   - Updates session status to `completed`

### Key Tables

| Table | Purpose |
|-------|---------|
| `profiling_session` | User's screening session |
| `profiling_session_file` | Files attached to session |
| `resume_file` | Uploaded resume metadata + R2 key |
| `pipeline_job` | Pipeline execution tracking |
| `candidate_result` | Scored candidate output |

### Environment Variables

```bash
# API (.env)
CLOUDAMQP_URL=amqps://user:pass@host.cloudamqp.com/vhost
PIPELINE_CALLBACK_SECRET=shared-secret-here

# Pipeline (services/pipeline/.env)
CELERY_BROKER_URL=amqps://...
R2_ENDPOINT_URL=https://account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=resumemo
PIPELINE_CALLBACK_SECRET=...
```

---

## File Creation Guidelines

| What | Where |
|------|-------|
| UI primitives | `web/src/components/ui/` |
| Feature components | `web/src/components/` |
| Page components | `web/src/pages/` |
| Custom hooks | `web/src/hooks/` |
| Zustand stores | `web/src/stores/` |
| Route definitions | `web/src/routes/route-defs.tsx` |
| Shared types | `packages/shared/src/types/` |
| Database schemas | `packages/shared/src/schemas/` |
| API routes | `api/src/routes/` |
| Pipeline modules | `services/pipeline/pipeline/` |

---

## Roadmap

### Current Focus (Early Stage)

- [ ] Pipeline stability and error handling
- [ ] Frontend results page improvements
- [ ] Export functionality (CSV/JSON)
- [ ] Session history and dashboards

### Planned Features

- [ ] OCR support for scanned PDFs
- [ ] Semantic embeddings (sentence-transformers)
- [ ] Real-time progress (WebSocket/SSE)
- [ ] Multi-language support
- [ ] Custom-trained NER model

### Deferred Decisions

| Question | Current State | Revisit When |
|----------|---------------|--------------|
| OCR for scanned PDFs | Not supported; produces score 0 | User feedback indicates need |
| Semantic embeddings vs TF-IDF | TF-IDF for simplicity | Scoring accuracy needs improvement |
| Real-time progress | Frontend polls for status | Polling latency unacceptable |
| Celery result backend | Not used; callbacks via HTTP | Need monitoring dashboards |

---

## Reference Documents

- **[docs/pipeline-spec.md](./docs/pipeline-spec.md)** - Complete pipeline specification (authoritative)
- **[docs/system-guidelines.md](./docs/system-guidelines.md)** - Product intent and user workflows
- **[docs/architecture-structure.md](./docs/architecture-structure.md)** - High-level architecture
