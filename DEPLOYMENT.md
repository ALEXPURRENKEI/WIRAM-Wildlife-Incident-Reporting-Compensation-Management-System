# WIRAM Deployment Guide - Render

## Overview
This guide helps you deploy the WIRAM (Wildlife Incident Reporting and Compensation Management System) project to Render.

## Prerequisites
1. **GitHub Account** - Already configured ✅
2. **Render Account** - Create at https://render.com
3. **Project on GitHub** - Already pushed ✅

## Deployment Steps

### Step 1: Connect GitHub to Render
1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Select **"Connect your own GitHub repository"**
4. Authorize Render to access your GitHub account
5. Select the WIRAM repository

### Step 2: Render.yaml Configuration
The project includes a `render.yaml` file that automatically configures both services:

```yaml
services:
  - type: web
    name: wiram-spring-backend
    runtime: docker
    rootDir: spring-backend
    plan: free
    
  - type: web
    name: wiram-frontend
    runtime: static
    rootDir: frontend
```

### Step 3: Configure Environment Variables

#### For Backend (wiram-spring-backend)

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `CORS_ORIGIN` | https://wiram-frontend.onrender.com | Yes |
| `SEED_DEMO_DATA` | true/false | No (default: false) |

#### PostgreSQL Database Setup
1. In Render Dashboard, create a new PostgreSQL database:
   - Name: wiram_db
   - Plan: Free tier
2. Copy the connection string (Internal Database URL)
3. Use this as `DATABASE_URL` for backend

### Step 4: Deploy the Project

#### Method 1: Automatic Deployment (Recommended)
1. Go to https://dashboard.render.com/blueprints
2. Click "New Blueprint Instance"
3. Paste this GitHub repo URL:
   ```
   https://github.com/ALEXPURRENKEI/WIRAM-Wildlife-Incident-Reporting-Compensation-Management-System
   ```
4. Render automatically detects `render.yaml`
5. Configure environment variables
6. Click "Deploy Blueprint"

#### Method 2: Manual Deployment
1. **Create Backend Service**:
   - New → Web Service
   - Connect GitHub repo
   - Name: wiram-spring-backend
   - Root Directory: spring-backend
   - Runtime: Docker
   - Plan: Free
   - Add environment variables

2. **Create Frontend Service**:
   - New → Static Site
   - Connect GitHub repo
   - Name: wiram-frontend
   - Root Directory: frontend
   - Publish directory: .

### Step 5: Verify Deployment

**Backend Health Check**:
```bash
curl https://wiram-spring-backend.onrender.com/api/health
```

Expected response:
```json
{"status":"ok","service":"wiram-backend"}
```

**Frontend Access**:
- Login: https://wiram-frontend.onrender.com/login.html
- Admin Dashboard: https://wiram-frontend.onrender.com/admin-dashboard.html

### Step 6: Test the Application

1. **Register a new user**:
   - Go to /register.html
   - Create account
   - Login

2. **Submit an incident**:
   - Go to /report.html
   - Fill in incident details
   - Submit form

3. **Verify data**:
   - Check backend database
   - View in dashboard

## Service URLs

### Development (Local)
- Backend: http://localhost:8080
- Frontend: http://localhost:5173

### Production (Render)
- Backend: https://wiram-spring-backend.onrender.com
- Frontend: https://wiram-frontend.onrender.com

## Environment Variables Reference

### Backend Required Variables
```env
DATABASE_URL=postgresql://user:password@host:5432/wiram_db
CORS_ORIGIN=https://wiram-frontend.onrender.com
SEED_DEMO_DATA=false
PORT=8080
```

### Backend Optional Variables
```env
SERVER_PORT=8080
SPRING_JPA_HIBERNATE_DDL_AUTO=update
```

## Troubleshooting

### Issue: Backend Container Failing
**Solution**:
- Check PostgreSQL database URL is correct
- Verify all environment variables are set
- Check Render logs: Dashboard → Service → Logs

### Issue: Frontend Can't Connect to Backend
**Solution**:
- Verify `CORS_ORIGIN` environment variable
- Check frontend API_BASE_URL configuration
- Verify backend is running (health check endpoint)

### Issue: Database Connection Refused
**Solution**:
- Create PostgreSQL database in Render first
- Copy the correct connection string
- Wait 2-3 minutes for database to be ready

### Issue: Build Takes Too Long
**Solution**:
- Free tier has limited resources
- Upgrade to paid plan for faster builds
- Or wait for build to complete (can take 10-15 minutes)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user

### Reports
- `GET /api/reports` - List reports (filtered by role)
- `POST /api/reports` - Create new report
- `GET /api/reports/:id` - Get report details
- `PATCH /api/reports/:id/status` - Update status
- `PATCH /api/reports/:id/payment-mode` - Update payment mode
- `GET /api/reports/:id/history` - Get status history

### Users (Admin only)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user details
- `PATCH /api/users/:id` - Update user

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Database Schema

The application uses Hibernate ORM with automatic schema creation. Main tables:

```
users (id, name, email, password_hash, role, created_at, updated_at)
reports (id, reporter_id, animal_type, incident_type, location, description, 
         estimated_loss, evidence_name, evidence_data, payment_mode, status, 
         reviewed_by, reviewed_by_name, reviewed_at, created_at, updated_at)
report_status_history (id, report_id, status, notes, changed_by, changed_by_name, changed_at)
```

## Performance Tips

1. **Enable SEED_DEMO_DATA during development**:
   ```env
   SEED_DEMO_DATA=true
   ```

2. **Use appropriate CORS_ORIGIN**:
   - Development: http://localhost:5173
   - Production: https://wiram-frontend.onrender.com

3. **Monitor logs in Render**:
   - Check for database errors
   - Monitor API response times

## Custom Domain (Optional)

1. Go to Service Settings → Custom Domains
2. Add your domain (e.g., wiram.example.com)
3. Update CORS_ORIGIN if using frontend domain
4. Configure DNS records as shown

## Scaling for Production

1. **Upgrade Backend**:
   - Switch from Free to Standard plan
   - Enables better performance and reliability

2. **Upgrade Database**:
   - PostgreSQL Standard plan
   - Better backups and uptime SLA

3. **Setup Monitoring**:
   - Use Render's monitoring features
   - Set up alerts for failures

## Deployment Checklist

- [ ] GitHub repository is public
- [ ] render.yaml is in root directory
- [ ] PostgreSQL database created
- [ ] Environment variables configured
- [ ] Backend health check passing
- [ ] Frontend loads successfully
- [ ] Can login with demo credentials
- [ ] Can submit incident report
- [ ] Can view reports in dashboard
- [ ] Database data persists

## Support

- **Render Docs**: https://render.com/docs
- **Project Repository**: https://github.com/ALEXPURRENKEI/WIRAM-Wildlife-Incident-Reporting-Compensation-Management-System
- **Spring Boot Docs**: https://spring.io/projects/spring-boot

---

**Deployment Status**: Ready for Render
**Last Updated**: July 24, 2026
