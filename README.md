# Resumemo

Recruiter-facing resume screening platform with AI-assisted ranking, search, and export capabilities.

## Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Bun 1.3.6 |
| **Frontend** | Vite + React 19 + React Router DOM |
| **Styling** | Tailwind CSS v4 |
| **Backend** | ElysiaJS (Bun web framework) |
| **Database** | PostgreSQL with Drizzle ORM |
| **Auth** | Better Auth (email/password + OAuth) |
| **AI Pipeline** | Python 3.12+ with Celery + spaCy + scikit-learn (uv) |
| **Message Queue** | RabbitMQ (CloudAMQP) |
| **Storage** | Cloudflare R2 (S3-compatible) |
| **Monorepo** | Turborepo |

## Quick Start

```bash
# Install dependencies
bun install

# Start all services in dev mode
bun run dev

# Or start individually
bun run web    # Frontend at http://localhost:5173
bun run api    # Backend at http://localhost:8080
```

## Project Structure

```
resumemo/
├── web/                    # Vite React app
├── api/                    # Elysia API server
├── packages/shared/        # Types, schemas, constants
├── services/pipeline/      # Python AI pipeline (Celery workers)
├── docs/                   # Documentation
└── AGENTS.md               # AI agent instructions
```

## Documentation

- **[AGENTS.md](./AGENTS.md)** - Comprehensive reference for AI agents and contributors
- **[docs/pipeline-spec.md](./docs/pipeline-spec.md)** - AI pipeline architecture and implementation
- **[docs/architecture-structure.md](./docs/architecture-structure.md)** - System architecture overview
- **[docs/system-guidelines.md](./docs/system-guidelines.md)** - Product intent and workflows

## Development

```bash
# Lint
bun run lint

# Build
bun run build

# Database migrations
cd api && bun run push
```

## Status

> **Note**: This project is in early development. The AI pipeline and core features are functional but undergoing active iteration. Expect breaking changes.
