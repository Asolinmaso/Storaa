# Storaa — Auth

Next.js (App Router, TypeScript) authentication app for Storaa: login, signup, role selection, password reset, and a protected dashboard, backed by MongoDB.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI and JWT_SECRET
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

## Features

- **Pages**: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/select-role`, `/dashboard` (protected)
- **API**: `POST /api/auth/register | login | logout | role | forgot-password | reset-password`, `GET /api/auth/me`
- Passwords hashed with **bcrypt** (12 rounds); reset codes hashed and single-use with 15-minute expiry
- **JWT sessions** (jose, HS256) in an `httpOnly` cookie, 7-day expiry
- **Middleware** protects `/dashboard` and `/select-role`, and redirects authenticated users away from `/login` / `/signup`
- Duplicate registration blocked (unique email index + `ACCOUNT_EXISTS` handling)
- Error dialogs matching the design: Account Not Found, Account Already Found, Account Blocked
- Client + server validation, loading spinners, and friendly error banners
- Fully responsive (desktop / tablet / mobile)

## Structure

```
app/            pages + API route handlers
components/     reusable UI (AuthLayout, TextField, Button, Modal, …)
lib/            db connection, auth (JWT/cookies), validation
models/         Mongoose User model
middleware.ts   route protection
```

## Notes

- The password reset code is currently logged to the server console (`[Storaa] Password reset code for …`) — wire up an email provider in `app/api/auth/forgot-password/route.ts` for production.
- "Login with Google" is a UI placeholder; add an OAuth provider to enable it.
