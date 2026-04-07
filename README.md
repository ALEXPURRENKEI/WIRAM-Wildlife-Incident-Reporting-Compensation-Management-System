# WIRAM

Wildlife Incident Reporting and Compensation Management System

This repository now contains:

- A static frontend built with HTML, CSS, and Vanilla JavaScript
- An Express + PostgreSQL backend for real persistence on Neon / Render

The frontend still has a localStorage demo mode, and the backend is ready for API-based
integration.

## Project Structure

```text
/frontend
  index.html
  login.html
  register.html
  dashboard.html
  report.html
  my-reports.html
  claim-status.html
  officer-dashboard.html
  verify-incidents.html
  admin-dashboard.html
  manage-users.html
  reports.html
  /css/styles.css
  /js/app.js
  /js/auth.js
  /js/reports.js
  /assets/images/
  vercel.json

/backend
  package.json
  server.js
  .env.example
  /src
    app.js
    db.js
    config.js
    /middleware
    /routes
    /services
    /utils
```

## Demo Accounts

Password for all demo users: `password123`

- `member@wiram.org`
- `officer@wiram.org`
- `admin@wiram.org`

## Local Development

Frontend:

1. Open the `frontend` folder with a static server or deploy it directly to Vercel.

Backend:

1. Copy `backend/.env.example` to `backend/.env` or set the same variables on Render.
2. Set `DATABASE_URL` to your Neon PostgreSQL connection string.
3. Run `npm install` inside `backend`.
4. Start the API with `npm run dev`.

## Render / Vercel Deployment

Recommended setup:

1. Set the Vercel project root directory to `frontend`.
2. Deploy the backend separately on Render from the `backend` folder.
3. Add these Render environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `CORS_ORIGIN`
   - `SEED_DEMO_DATA`
   - `DATABASE_SSL`
4. Deploy the frontend as a static site.

The included `frontend/vercel.json` keeps the site clean and deployment-ready.

## Backend Notes

- Demo data is seeded automatically by default.
- Set `SEED_DEMO_DATA=false` in production if you want to disable demo accounts and reports.
- The API exposes auth, reports, users, and dashboard summary routes under `/api`.
