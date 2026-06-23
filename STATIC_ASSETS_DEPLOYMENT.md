# Static Assets Deployment Guide

## Overview
Static assets (images, videos) are now served from the backend to reduce frontend bundle size.

## Backend Serves Assets From:
- URL: `http://your-backend-url/static/`
- Directory: `backend/public/`

## Assets Included:
- **Video**: bg.mp4 (36MB)
- **Images**: All property images (a1-a35), logos, icons
- **Total Size**: ~38.7MB

## Deployment Steps:

### 1. Deploy to Production Server:
```bash
# Upload public folder to your server
scp -r backend/public/* user@your-server:/path/to/backend/public/

# Or use git (video excluded by .gitignore)
# Manually upload bg.mp4 via FTP/SCP
```

### 2. Update Vercel Environment Variables:
```
VITE_API_URL = http://YOUR_SERVER_IP:3000/api/v1
VITE_STATIC_URL = http://YOUR_SERVER_IP:3000/static
```

### 3. Frontend URLs Updated:
- Landing: bg.mp4, BR logo.webp
- Login: bg.mp4
- Register: bg.mp4

All now load from: `${VITE_STATIC_URL}/filename`

## Benefits:
✅ Frontend size reduced from 38.7MB to < 1MB
✅ Faster Vercel deployments
✅ Cached static assets (1 year cache)
✅ Centralized asset management

## Testing:
```bash
# Test backend static serving
curl http://localhost:3000/static/BR%20logo.webp

# Test in browser
http://localhost:3000/static/bg.mp4
```
