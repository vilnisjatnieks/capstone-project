# Architecture — Karson Institute Digital Library

## Project Overview

A Next.js web application for managing the Karson Institute's digital collection of social work resources. Users can browse, search, and request checkouts; staff can manage the collection, process checkouts, and handle extension requests; admins manage users. The system also handles automated overdue/reminder notifications via scheduled cron endpoints.

---

## Tech Stack

| Technology | Role |
|---|---|
| Next.js 16 (App Router) | Full-stack framework — pages, API routes, server/client component split |
| React 19 | UI rendering; server components by default, `"use client"` only where needed |
| TypeScript | Static typing throughout |
| Tailwind CSS 4 + ShadCN UI | Utility-first styling + Radix-based component primitives |
| PostgreSQL + `pg` | Persistence; raw parameterized SQL, no ORM |
| scrypt (Node built-in) | Password hashing — memory-hard, resistant to GPU cracking |
| Cookie-based sessions in PostgreSQL | Auth state stored server-side; no JWTs |
| Resend | Transactional email (reminder notices); falls back to console logging if key absent |
| Jest 30 | Testing; 80% line coverage minimum |

---

## Getting Started

```bash
# 1. Clone
git clone <repo-url>
cd capstone-project

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env — see Environment Variables section below

# 4. Run database migrations (also seeds the admin user)
npm run migrate

# 5. Start dev server
npm run dev
# → http://localhost:3000

# migrate seeds a default admin account — check migrate.ts for the credentials
# Change the password before deploying to any non-local environment
```

**Requirements:** Node 20+, PostgreSQL 12+

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/dbname` |
| `CRON_SECRET` | Yes | Arbitrary secret string; cron endpoints require `Authorization: Bearer <value>` |
| `RESEND_API_KEY` | No | Resend API key for transactional email; omit to fall back to console logging |

`NODE_ENV` is read automatically by Next.js; the auth code uses it to set the `Secure` flag on session cookies.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Home — search bar + recommendations
│   ├── login/                    # Login page
│   ├── register/                 # Registration page
│   ├── search/                   # Search results (split: page.tsx + search-client.tsx)
│   ├── profile/                  # Authenticated user — checkout history
│   ├── admin/                    # Admin — user management
│   ├── staff/                    # Staff — works, checkouts, tags
│   ├── works/[id]/               # Public work detail page
│   └── api/
│       ├── auth/                 # login, logout, register
│       ├── admin/users/          # Admin user CRUD
│       ├── staff/                # works, checkouts, tags (staff-guarded)
│       ├── works/[id]/           # Public: cover image, hold, rating
│       ├── checkouts/[id]/       # User: request extension
│       ├── notifications/        # List + mark-read
│       ├── recommendations/      # Personalized recommendations
│       ├── search/               # works, tags, popular
│       └── cron/                 # overdue, reminders (Bearer-token guarded)
├── components/
│   ├── ui/                       # ShadCN primitives (Button, Dialog, Input, etc.)
│   ├── header.tsx                # Global nav with auth state
│   ├── notification-bell.tsx     # Unread count badge
│   ├── star-rating.tsx           # Interactive 1–5 star picker
│   └── recommendations-section.tsx
├── lib/
│   ├── db.ts                     # Singleton pg pool + query helper
│   ├── auth.ts                   # getCurrentUser(), password hash/verify
│   ├── admin.ts                  # requireAdmin() guard
│   ├── staff.ts                  # requireStaff() guard
│   ├── email.ts                  # sendReminderEmail() via Resend
│   ├── validation.ts             # Email/password format checks
│   ├── isbn-lookup.ts            # Google Books → Open Library metadata fetch
│   ├── migrate.ts                # Migration runner + admin seed
│   ├── data/                     # Data access layer (one file per domain)
│   │   ├── users.ts
│   │   ├── works.ts
│   │   ├── checkouts.ts
│   │   ├── sessions.ts
│   │   ├── tags.ts
│   │   ├── ratings.ts
│   │   ├── holds.ts
│   │   ├── notifications.ts
│   │   └── recommendations.ts
│   └── migrations/               # Numbered SQL files, run in order
│       ├── 001_create_users_table.sql
│       ├── 002_create_checkouts_table.sql
│       └── ...009_create_notifications_table.sql
└── __tests__/                    # Jest tests mirroring src/ structure
```

**Non-obvious bits:**

- `search/search-client.tsx` pattern — pages that need client interactivity (state, event handlers) are split. The `page.tsx` is a server component that renders the client file; this keeps the RSC/SSR boundary explicit.
- `lib/data/` is the **only** place that touches the database. API routes call data functions, never raw SQL directly.
- `lib/migrate.ts` doubles as a seed script — it inserts the admin user if the email doesn't already exist.

---

## Database Schema

### `users`
```sql
id UUID PK | email UNIQUE | password_hash | name | role ('admin'|'staff'|'user') | created_at | updated_at
```

### `sessions`
```sql
id UUID PK | user_id → users | expires_at | created_at
```
Indexed on `user_id` and `expires_at`. Sessions expire after 7 days.

### `works`
```sql
id BIGINT PK | title | date_published | publisher | editor | lccn | isbn_10 | isbn_13
media_type | number_of_pages | language | location | call_number | cover (BYTEA) | created_at | updated_at
```
> [verify: no migration file creates this table — see Known Limitations]

### `checkouts`
```sql
id UUID PK | work_id → works | user_id → users | checked_out_at | due_date | returned_at
reminder_sent_at | overdue_notified_at | extension_status ('none'|'pending'|'approved'|'rejected') | created_at | updated_at
```

### `tags` + `work_tags`
```sql
tags:      id UUID PK | name UNIQUE | color (hex) | created_at | updated_at
work_tags: work_id → works | tag_id → tags  (composite PK)
```

### `ratings`
```sql
id UUID PK | work_id → works | user_id → users | rating SMALLINT (1–5) | created_at | updated_at
UNIQUE (user_id, work_id)
```
Only users who have a returned checkout for a work may rate it (enforced in business logic, not a DB constraint).

### `holds`
```sql
id UUID PK | work_id UNIQUE → works | user_id UNIQUE → users | created_at
```
Both `work_id` and `user_id` are unique — one hold per work, one hold per user at a time.

### `notifications`
```sql
id UUID PK | user_id → users | message | checkout_id → checkouts | read_at | created_at
```
`read_at IS NULL` means unread.

### Migration runner

`npm run migrate` reads `src/lib/migrations/*.sql` in alphabetical order, skipping already-applied files tracked in a `migrations` table. Always add new SQL files with the next numeric prefix.

---

## Key Architectural Decisions

### 1. Raw SQL, no ORM
Every query in `src/lib/data/` is a parameterized `pg` query. This avoids ORM abstraction overhead and keeps queries readable for a team comfortable with SQL, but means schema changes require both a migration file and manual updates to affected data functions.

### 2. Cookie-based sessions in PostgreSQL (no JWTs)
Sessions are rows in the `sessions` table. This makes revocation trivial (delete the row) and keeps auth state off the client entirely. The trade-off is a DB read on every authenticated request. `getCurrentUser()` in `lib/auth.ts` does a single `JOIN` between `sessions` and `users`.

### 3. Authorization via guard helpers, not middleware
`requireAdmin()` and `requireStaff()` are called at the top of each API route handler, not in `middleware.ts`. This keeps auth logic co-located with the route and avoids route-matcher complexity. The guards return `{ authorized, user, response }` so the calling route can early-return the error response.

### 4. Cover images stored as BYTEA in PostgreSQL
Book cover images are stored directly in the `works.cover` column as binary data, served via `/api/works/[id]/cover`. This avoids an external storage dependency but limits cover image size and adds DB load for image requests. `getAllWorks()` deliberately excludes the `cover` column to avoid fetching blobs on list views.

### 5. Recommendations are computed on-the-fly
`getRecommendations()` runs live SQL — no pre-computed cache. Strategy: tag-overlap with user's checkout history, falling back to top-rated works. Scales fine for small collections; would need caching or a background job for large catalogs.

### 6. Cron jobs are HTTP endpoints, not background workers
`/api/cron/reminders` and `/api/cron/overdue` are plain GET routes protected by a Bearer token. An external scheduler (GitHub Actions, cloud cron, etc.) calls them on a schedule. This is simple to operate but requires the external scheduler to be configured separately.

### 7. Email is optional
`lib/email.ts` checks for `RESEND_API_KEY` at call time. If absent, it logs to console instead of throwing. This lets the app run locally without email configuration.

---

## Known Limitations

### Missing `works` table migration
> **[verify: critical]** The `works` table is referenced as a foreign key in `checkouts`, `ratings`, `holds`, and `work_tags`, but no migration file creates it. The app likely relies on a manually created table or a migration that was lost. Before setting up a fresh database, add a migration file (e.g., `000_create_works_table.sql`) with the schema shown in the Database Schema section above.

### No soft deletes
Works, users, checkouts, and tags are hard-deleted. Deleting a work cascades to its checkouts, ratings, holds, and tags. There is no archive/trash concept.

### No pagination on list endpoints
Staff endpoints like `GET /api/staff/works` and `GET /api/admin/users` return all rows. Fine for the expected collection size; would need `LIMIT`/`OFFSET` or cursor pagination at scale.

### Holds are one-per-user globally
The `holds.user_id UNIQUE` constraint means a user can hold at most one work at a time across the entire collection. This may be intentional library policy or a simplification.

### No CSRF protection
API routes use cookie-based auth but don't implement CSRF tokens. Same-site `lax` cookies provide partial protection; a future hardening pass could add explicit CSRF checks.

### Search is ILIKE only
Full-text search uses `ILIKE '%term%'` on title, publisher, editor, ISBN, and LCCN. No PostgreSQL `tsvector`/`tsquery` full-text indexing. Acceptable for small catalogs; slow on large ones.

### Admin seed credentials are hardcoded
`migrate.ts` seeds a default admin account with hardcoded credentials. Change the password immediately after first login in any non-local environment.
