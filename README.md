# WIRAM

Wildlife Incident Reporting and Compensation Management System

This repository contains:

- A responsive static frontend built with HTML, CSS, and Vanilla JavaScript
- A Spring Boot backend with PostgreSQL persistence for real API-backed workflows

The frontend now talks to the Spring Boot API when a backend URL is configured, and it still keeps a localStorage demo fallback for offline/testing use.

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

/spring-backend
  pom.xml
  src/main/java/com/wiram/backend/
  src/main/resources/application.yml

render.yaml
```

## Demo Accounts

Password for all demo users: `password123`

- `member@wiram.org`
- `officer@wiram.org`
- `admin@wiram.org`

## Local Development

### Frontend

Open the `frontend` folder with a static server or deploy it directly to Vercel.

By default, the frontend looks for the API at `http://localhost:8080` during local development.
If you deploy the backend to Render, update the frontend API base URL in `frontend/js/app.js`
or set `localStorage.wiram_api_base_url` to your Render service URL.

### Backend

Requirements:

- Java 17
- Maven

Run the Spring backend from the `spring-backend` folder:

```bash
mvn spring-boot:run
```

## Environment Variables

Set these in Render for the Spring Boot backend:

- `DATABASE_URL`
- `CORS_ORIGIN`
- `SEED_DEMO_DATA`
- `PORT`

Recommended values:

- `DATABASE_URL` = your Neon PostgreSQL connection string
- `CORS_ORIGIN` = your frontend URL or `*` during local testing
- `SEED_DEMO_DATA` = `true` for demo setups, `false` in production

Important:

- Do not commit `DATABASE_URL` into the frontend or repository.
- The backend normalizes the raw Neon URI into a JDBC connection internally.
- The token returned by the auth endpoints can be sent as `Authorization: Bearer <token>` or `X-Auth-Token`.

## API Summary

The Spring Boot backend exposes:

- `/api/health`
- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/me`
- `/api/reports`
- `/api/reports/my`
- `/api/reports/{id}`
- `/api/reports/{id}/status`
- `/api/reports/{id}/history`
- `/api/dashboard`
- `/api/dashboard/member`
- `/api/dashboard/officer`
- `/api/dashboard/admin`
- `/api/users`
- `/api/users/{id}/role`

## Render / Vercel Deployment

Recommended setup:

1. Set the Vercel project root directory to `frontend`.
2. Deploy the Spring Boot backend on Render using the included `render.yaml` Blueprint.
3. Add the environment variables listed above to Render.
4. Keep the frontend static and let it call the Render API when you wire it up.

Render deployment options for the backend:

- Recommended: use the included `render.yaml` Blueprint, which deploys the Spring backend as a Docker web service.
- If you keep a manually created Java service, use:
  - Build command: `mvn -DskipTests package`
  - Start command: `java -Dserver.port=$PORT -jar target/wiram-spring-backend-1.0.0.jar`
- Do not use `mvn spring-boot:run` as the Render start command. The runtime image does not include Maven, which is why the deploy failed.
- The Docker image now uses a small entrypoint script, so the container starts the JAR directly even if Render still has an older Docker command saved in the service settings.

## Notes

- Demo users and sample incidents are seeded automatically by default.
- Set `SEED_DEMO_DATA=false` in production if you want to disable the demo dataset.
- The backend uses PostgreSQL through JPA/Hibernate and is ready for Render deployment.
- If you use the Docker Blueprint, Render only needs the repo path in the Blueprint and the `DATABASE_URL` / `CORS_ORIGIN` env vars.
