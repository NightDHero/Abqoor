# Abqoor

Abqoor is an adaptive Qudurat exam preparation platform for students in Saudi Arabia.

This repository currently contains a clean full-stack starter scaffold only. Product logic, authentication, question handling, study sessions, and progress tracking are intentionally not implemented yet.

## Structure

- `apps/api` - Backend API server.
- `apps/web` - Frontend web app.
- `docs` - Project context and product notes.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the backend:

```bash
npm run dev:api
```

Run the frontend:

```bash
npm run dev:web
```

Backend health check:

```bash
curl http://localhost:4000/health
```

## Authentication

The API stores users in SQLite and uses an HTTP-only JWT session cookie.

Copy the API environment example before running locally:

```bash
cp apps/api/.env.example apps/api/.env
```

Auth endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
