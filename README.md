# WIRAM

Wildlife Incident Reporting and Compensation Management System

This repository contains a static frontend built with HTML, CSS, and Vanilla JavaScript.
It uses `localStorage` to simulate authentication, incident reporting, and claim tracking.

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
```

## Demo Accounts

Password for all demo users: `password123`

- `member@wiram.org`
- `officer@wiram.org`
- `admin@wiram.org`

## Local Development

Open the `frontend` folder with a static server or deploy it directly to Vercel as a static site.

## Vercel Deployment

Recommended setup:

1. Set the Vercel project root directory to `frontend`.
2. Deploy the project as a static site.
3. No backend configuration is required.

The included `frontend/vercel.json` keeps the site clean and deployment-ready.
