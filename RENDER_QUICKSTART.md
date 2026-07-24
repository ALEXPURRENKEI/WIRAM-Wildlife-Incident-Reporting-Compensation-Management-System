# Quick Start: Deploy to Render in 5 Minutes

## What You Need
✅ GitHub repository (already set up)
✅ Render account (free at https://render.com)

## 5-Minute Deployment

### 1. Create Render Account (2 min)
- Go to https://render.com
- Sign up with GitHub
- Authorize Render

### 2. Create PostgreSQL Database (1 min)
1. Render Dashboard → New → PostgreSQL
2. Name: `wiram_db`
3. Copy the **Internal Database URL**

### 3. Deploy with Blueprint (2 min)
1. Go to https://dashboard.render.com/blueprints
2. Click "New Blueprint Instance"
3. Paste GitHub URL:
   ```
   https://github.com/ALEXPURRENKEI/WIRAM-Wildlife-Incident-Reporting-Compensation-Management-System
   ```
4. Set environment variables:
   - `DATABASE_URL`: Paste the internal URL from step 2
   - `CORS_ORIGIN`: `https://wiram-frontend.onrender.com`
   - `SEED_DEMO_DATA`: `true`

5. Click "Deploy Blueprint"

### Done! ✅
- Backend: https://wiram-spring-backend.onrender.com/api/health
- Frontend: https://wiram-frontend.onrender.com/login.html

## Default Demo Credentials
- Email: `admin@wiram.org`
- Password: `password123`

## After Deployment
1. Visit frontend login page
2. Login with demo credentials
3. Explore admin dashboard
4. Test creating new incidents
5. Check deployed backend API

---

**Full Guide**: See DEPLOYMENT.md for detailed instructions
