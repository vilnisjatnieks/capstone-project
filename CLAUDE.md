# Karson Institute Digital Library

A Next.js web application for managing the Karson Institute's digital library of social work resources. Supports role-based access (admin, staff, user) for browsing, searching, and managing books and materials.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4, ShadCN UI
- **Database:** PostgreSQL with raw SQL via `pg` (no ORM)
- **Auth:** Cookie-based sessions stored in PostgreSQL, scrypt password hashing
- **Testing:** Jest 30 (80% line coverage minimum)

## Project Structure

```
src/app/          - Pages and API routes (Next.js App Router)
src/components/   - React components (ui/ for ShadCN primitives)
src/lib/          - DB connection, auth, authorization helpers, migrations
src/__tests__/    - Jest tests mirroring src/ structure
docs/             - Project documentation PDFs
```

## Commands

```bash
npm run dev              # Start dev server
npm test                 # Run tests
npm test -- --coverage   # Run tests with coverage
npm run migrate          # Run database migrations
```

## Coding Conventions

### Naming
- **Variables/functions:** camelCase
- **Components:** PascalCase
- **Files:** kebab-case
- **Constants:** SCREAMING_SNAKE_CASE
- **DB columns:** snake_case

### Imports
- `@/*` alias resolves to `src/*`

### Components
- Server Components by default; add `"use client"` only when needed
- Client-heavy pages split into `*-client.tsx` files

### Database
- Direct parameterized SQL queries — no ORM
- UUIDs for primary keys
- TIMESTAMPTZ for all timestamps

## Auth Pattern

Cookie-based sessions stored in PostgreSQL with scrypt password hashing. Guard helpers in `src/lib/`:
- `requireAdmin()` — restricts to admin role
- `requireStaff()` — restricts to staff role

## Branching & Git

- Branch off `dev`
- Branch naming: `<story-id>-<story-name>` (e.g. `A0-users-crud`)
- PRs reviewed before merging to `dev`
- Merge to `main` at end of each sprint
- 80% line coverage minimum