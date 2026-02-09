# Capstone Project

Next.js application with TypeScript, Tailwind CSS, ShadCN UI, Jest, and PostgreSQL.

## Prerequisites

- Node.js 20+
- PostgreSQL database

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```
Update `DATABASE_URL` in `.env` with your PostgreSQL credentials.

3. Start development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Scripts

- `npm run dev` - Development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run linter
