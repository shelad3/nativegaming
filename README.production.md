# PlayNative Production Deployment Guide

This guide covers deploying PlayNative to production using Firebase, MongoDB Atlas, Pesapal, and Vercel.

## Prerequisites

- Node.js 18+ installed
- Git repository set up
- Accounts created for:
  - Firebase
  - MongoDB Atlas
  - Pesapal
  - Vercel
  - Google Cloud Console (for OAuth)

---

## 1. MongoDB Atlas Setup

### Create Cluster
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new project: "PlayNative Production"
3. Create a free M0 cluster
4. Click "Connect" → "Connect your application"
5. Copy the connection string

### Configure Access
1. **Database Access**: Create a user with read/write permissions
2. **Network Access**: Add `0.0.0.0/0` (or specific IPs for production)
3. **Connection String**: 
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/nativecodex?retryWrites=true&w=majority
   ```

---

## 2. Firebase Configuration

### Enable Services
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. **Authentication**:
   - Enable Google Sign-In
   - Add authorized domains (your Vercel URL)
4. **Storage**:
   - Enable Firebase Storage
   - Set up security rules (see below)

### Storage Security Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User files
    match /users/{userId}/{allPaths=**} {
      allow read;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public files
    match /public/{allPaths=**} {
      allow read;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 3. Pesapal Setup

### Register Account
1. Go to [Pesapal](https://www.pesapal.com/)
2. Register for a merchant account
3. Complete KYC verification

### Get Credentials
1. Log in to Pesapal Dashboard
2. Go to "Settings" → "API Integration"
3. Get your:
   - Consumer Key
   - Consumer Secret
4. Start with **Sandbox** environment for testing

### Test with Sandbox
- Use test credentials first
- Test phone: `+254722000000`
- Test M-PESA PIN: `1234`

---

## 4. Google OAuth Configuration

### Update Authorized Origins
1. [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add authorized origins:
   - `https://your-app.vercel.app`
5. Add authorized redirect URIs:
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/__/auth/handler` (Firebase)

---

## 5. Backend Deployment Options

### Option A: Render.com (Recommended)

1. **Create Account**: [Render.com](https://render.com/)
2. **New Web Service**: Connect your Git repository
3. **Configuration**:
   - **Build Command**: `npm install`
   - **Start Command**: `npm run server`
   - **Root Directory**: `/server` (or leave blank if root)
4. **Environment Variables**: Add all from `.env.production`
5. **Deploy**: Click "Create Web Service"

### Option B: Railway.app

1. **Create Account**: [Railway.app](https://railway.app/)
2. **New Project**: "Deploy from GitHub repo"
3. **Configuration**:
   - **Start Command**: `npm run server`
4. **Environment Variables**: Add all variables
5. **Deploy**: Automatic on push

### Option C: Heroku

1. **Create App**: `heroku create playnat ive-api`
2. **Add Buildpack**: `heroku buildpacks:set heroku/nodejs`
3. **Environment Variables**:
   ```bash
   heroku config:set MONGODB_URI=<your-uri>
   heroku config:set JWT_SECRET=<your-secret>
   # ... add all variables
   ```
4. **Deploy**: `git push heroku main`

---

## 6. Frontend Deployment (Vercel)

### Deploy to Vercel

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Via Dashboard**:
   - Go to [Vercel](https://vercel.com/)
   - Import Git Repository
   - Configure Project:
     - Framework Preset: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`

3. **Environment Variables**:
   Add in Vercel dashboard under Settings → Environment Variables:
   ```
   VITE_FIREBASE_API_KEY=<your-key>
   VITE_FIREBASE_AUTH_DOMAIN=<your-domain>
   VITE_FIREBASE_PROJECT_ID=<your-id>
   VITE_FIREBASE_STORAGE_BUCKET=<your-bucket>
   VITE_FIREBASE_MESSAGING_SENDER_ID=<your-id>
   VITE_FIREBASE_APP_ID=<your-id>
   VITE_API_URL=https://your-backend.render.com
   VITE_GEMINI_API_KEY=<your-key>
   ```

4 **Deploy**: Vercel auto-deploys on Git push

### Custom Domain (Optional)
1. Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

---

## 7. Environment Variables Checklist

### Backend (.env.production or Render/Railway)
```bash
# Database
MONGODB_URI=mongodb+srv://...

# Auth
JWT_SECRET=<generate-secure-32char-secret>
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...

# Pesapal
PESAPAL_CONSUMER_KEY=...
PESAPAL_CONSUMER_SECRET=...
PESAPAL_ENVIRONMENT=sandbox  # Change to 'production' when ready
PESAPAL_IPN_URL=https://your-backend.render.com/api/payments/ipn

# Server
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend (Vercel)
```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_API_URL=https://your-backend.render.com
VITE_GEMINI_API_KEY=...
```

---

## 8. Post-Deployment Testing

### Test Checklist
- [ ] Homepage loads
- [ ] Google Sign-In works
- [ ] User can create account
- [ ] Profile updates work
- [ ] File uploads (avatar/banner) work
- [ ] Payment flow (Pesapal sandbox)
- [ ] Real-time features (Socket.IO)
- [ ] API endpoints respond
- [ ] Database writes succeed

### Pesapal Sandbox Testing
1. Create test account
2. Go to Coin Store
3. Purchase CodeBits package
4. Complete sandbox payment
5. Verify CodeBits credited

---

## 9. Going Live with Pesapal

### Switch to Production
1. Complete Pesapal KYC verification
2. Update environment variable:
   ```bash
   PESAPAL_ENVIRONMENT=production
   ```
3. Update IPN URL in Pesapal dashboard
4. Test with real payment (small amount)
5. Monitor transactions

---

## 10. Monitoring & Maintenance

### Error Tracking
- **Sentry**: Add for error tracking
  ```bash
  npm install @sentry/node @sentry/react
  ```

### Performance
- **Vercel Analytics**: Enable in dashboard
- Monitor API response times

### Database
- MongoDB Atlas → Metrics tab
- Set up alerts for high usage

### Backups
- MongoDB Atlas: Automatic backups enabled
- Firebase: Configure backup schedule

---

## 11. Security Checklist

- [ ] All API keys in environment variables
- [ ] `.env` files in `.gitignore`
- [ ] CORS configured with exact domains
- [ ] Rate limiting enabled
- [ ] Helmet security headers active
- [ ] HTTPS only (Vercel provides)
- [ ] Firebase Security Rules configured
- [ ] MongoDB network access restricted
- [ ] JWT secret is strong (32+ chars)
- [ ] Pesapal IPN URL is HTTPS

---

## 12. Troubleshooting

### Frontend not connecting to backend
- Check `VITE_API_URL` in Vercel
- Verify CORS allows your Vercel domain
- Check browser console for errors

### Payments not processing
- Verify Pesapal credentials
- Check IPN URL is accessible (not localhost)
- Review backend logs for errors

### File uploads failing
- Check Firebase Storage rules
- Verify Firebase Storage is enabled
- Check file size limits

### Database connection errors
- Verify MongoDB Atlas connection string
- Check network access whitelist
- Ensure database user has correct permissions

---

## Quick Deploy Commands

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Test backend locally
npm run server

# Build frontend
npm run build

# Deploy to Vercel (via CLI)
vercel --prod
```

---

## Support Resources

- **Firebase**: https://firebase.google.com/docs
- **MongoDB Atlas**: https://docs.atlas.mongodb.com/
- **Pesapal**: https://developer.pesapal.com/
- **Vercel**: https://vercel.com/docs
- **Render**: https://render.com/docs

---

**Deployment Status Tracker**

- [ ] MongoDB Atlas cluster created
- [ ] Firebase Storage enabled
- [ ] Pesapal account verified
- [ ] Google OAuth credentials updated
- [ ] Backend deployed to Render/Railway
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] End-to-end testing completed
- [ ] Production payment tested
- [ ] Monitoring set up

---

*Good luck with your deployment! 🚀*
