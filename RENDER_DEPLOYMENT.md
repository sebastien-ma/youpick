# Render Deployment Guide for YouPick

## Prerequisites
1. Render account (https://render.com)
2. GitHub repository connected to Render
3. PostgreSQL database (can use Render's PostgreSQL or existing Aiven)

## 1. Deploy Backend API

### Create New Web Service on Render Dashboard
1. Go to Render Dashboard → "New +" → "Web Service"
2. Connect your GitHub repository: `sebastien-ma/youpick`
3. Configure the service:

**Basic Settings:**
- **Name:** `youpick-api` (or your preferred name)
- **Region:** Oregon (or closest to your users)
- **Branch:** main
- **Root Directory:** `product/api`
- **Runtime:** Node

**Build & Deploy Commands:**
```bash
# Build Command:
npm install

# Start Command:
npm start
```

**Instance Type:**
- Free tier (or Starter for $7/month for better performance)

### Environment Variables for API
Add these in Render dashboard → Environment tab:

```bash
# Required
NODE_ENV=production
PORT=10000
DATABASE_URL=your_postgres_connection_string_here

# CORS Settings (update with your actual web URL after deploying)
ALLOWED_ORIGINS=https://youpick-web.onrender.com,https://your-custom-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Node.js SSL (if using Aiven or external DB with SSL)
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Health Check Settings
- **Health Check Path:** `/health`

---

## 2. Deploy Frontend Web Application

### Create New Static Site on Render Dashboard
1. Go to Render Dashboard → "New +" → "Static Site"
2. Connect your GitHub repository: `sebastien-ma/youpick`
3. Configure the static site:

**Basic Settings:**
- **Name:** `youpick-web` (or your preferred name)
- **Branch:** main
- **Root Directory:** `product/web`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`

### Environment Variables for Web
Add in Render dashboard during creation or in Environment tab:

```bash
# Point to your deployed API (update after API is deployed)
VITE_API_URL=https://youpick-api.onrender.com/api
```

### Redirect/Rewrite Rules
Add these in the "Redirects/Rewrites" section for React Router:
```
/* /index.html 200
```

---

## 3. Database Setup Options

### Option A: Use Render PostgreSQL
1. Create new PostgreSQL instance on Render
2. Copy the External Database URL
3. Add it as DATABASE_URL in your API environment variables

### Option B: Use Existing Aiven PostgreSQL
1. Keep your existing Aiven DATABASE_URL
2. Ensure `NODE_TLS_REJECT_UNAUTHORIZED=0` is set in API env vars
3. Make sure the ca.pem certificate is included in your deployment

---

## 4. Deployment Commands (Alternative: Using Render CLI)

If you prefer command line deployment:

### Install Render CLI
```bash
# macOS
brew install render/render/render

# or via npm
npm install -g @render/cli
```

### Deploy via CLI
```bash
# Login to Render
render login

# Deploy API
cd product/api
render create web youpick-api \
  --env NODE_ENV=production \
  --env PORT=10000 \
  --env DATABASE_URL=your_database_url \
  --env ALLOWED_ORIGINS=https://youpick-web.onrender.com \
  --build-command "npm install" \
  --start-command "npm start"

# Deploy Web
cd ../web
render create static youpick-web \
  --env VITE_API_URL=https://youpick-api.onrender.com/api \
  --build-command "npm install && npm run build" \
  --publish-path dist
```

---

## 5. Post-Deployment Steps

### Verify Deployment
1. **API Health Check:** Visit `https://youpick-api.onrender.com/health`
2. **Web App:** Visit `https://youpick-web.onrender.com`

### Update CORS Settings
After both services are deployed:
1. Go to API service environment variables
2. Update `ALLOWED_ORIGINS` to include your actual web URL:
   ```
   ALLOWED_ORIGINS=https://youpick-web.onrender.com
   ```

### Custom Domain (Optional)
1. In Render dashboard, go to Settings → Custom Domains
2. Add your domain and follow DNS configuration instructions

### Monitor Logs
- Check deployment logs in Render dashboard
- Monitor runtime logs for any issues

---

## 6. Important Notes

### Free Tier Limitations
- Services spin down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- Limited to 750 hours/month across all free services

### Production Recommendations
1. Upgrade to paid tier for always-on services
2. Set up proper SSL certificates for database
3. Use environment-specific configurations
4. Enable auto-deploy from GitHub main branch
5. Set up monitoring and alerts

### Security Best Practices
1. Never commit `.env` files
2. Use Render's secret management for sensitive data
3. Regularly rotate database credentials
4. Keep dependencies updated

---

## Troubleshooting

### Common Issues

**API not connecting to database:**
- Verify DATABASE_URL is correctly set
- Check if PostgreSQL allows external connections
- Ensure SSL settings match your database requirements

**CORS errors:**
- Update ALLOWED_ORIGINS in API environment
- Ensure protocol (http/https) matches exactly

**Build failures:**
- Check Node.js version compatibility
- Ensure all dependencies are in package.json
- Review build logs for specific errors

**Static site not routing properly:**
- Ensure redirect rules are configured
- Check that publish directory is correct (`dist`)

---

## Quick Reference

### API Service
- **Root Dir:** `product/api`
- **Build:** `npm install`
- **Start:** `npm start`
- **Port:** 10000

### Web Service
- **Root Dir:** `product/web`
- **Build:** `npm install && npm run build`
- **Publish:** `dist`

### URLs (after deployment)
- **API:** `https://[your-api-name].onrender.com`
- **Web:** `https://[your-web-name].onrender.com`
- **Health:** `https://[your-api-name].onrender.com/health`