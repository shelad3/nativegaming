# PlayNative - Feature Updates for Production Deployment

**Document Version:** 1.0  
**Last Updated:** 2026-01-13  
**Status:** Ready for Implementation

---

## Executive Summary

This document outlines the comprehensive updates required to transform PlayNative from a development prototype to a fully production-ready platform. The project currently uses Firebase for authentication, MongoDB for data persistence, and has a functional backend. Key areas requiring updates include:

1. **Payment Integration** - Replace Stripe with Pesapal
2. **Environment Configuration** - Production-ready setup
3. **Deployment Configuration** - Vercel frontend + backend hosting
4. **Real Integrations** - Remove all simulations and mock data
5. **Security Hardening** - Production security measures

---

## 📊 Current State Analysis

### ✅ What's Already Working

#### Authentication System
- ✅ Firebase Authentication integrated
- ✅ Google OAuth implementation active
- ✅ JWT token management in place
- ✅ Backend authentication middleware configured
- **Location:** `src/services/firebase.ts`, `server/routes/auth.ts`

#### Database Integration
- ✅ MongoDB integration via Mongoose
- ✅ Real database schemas defined (20 models)
- ✅ Backend mode set to 'REAL' (not mock)
- **Location:** `server/models/*`, `server/index.ts`

#### Backend API
- ✅ Express.js server with REST endpoints
- ✅ Socket.IO for real-time features
- ✅ CORS configured for development
- **Location:** `server/index.ts`, `server/routes/*`

#### Frontend Features
- ✅ React + TypeScript + Vite
- ✅ All major components implemented
- ✅ Real backend service integration
- **Location:** `src/components/*`, `src/services/realBackend.ts`

### ⚠️ Areas Requiring Updates

#### 1. Payment System (CRITICAL)
- ❌ Currently uses Stripe throughout
- ❌ Hardcoded Stripe checkout in `CoinStore.tsx`
- ❌ Missing `/api/payments/create-checkout-session` endpoint
- ❌ Stripe webhook handlers need replacement

#### 2. Environment Variables
- ⚠️ Firebase config using environment variables (good)
- ⚠️ MongoDB fallback to localhost (needs Atlas URL)
- ⚠️ Missing Pesapal credentials
- ⚠️ CORS restricted to localhost

#### 3. File Upload System
- ⚠️ Mock file upload in `realBackend.ts` (line 115-124)
- ❌ Returns Unsplash URLs instead of real uploads
- ❌ No Firebase Storage integration active

#### 4. Media Processing
- ⚠️ FFmpeg utilities exist but return mock URLs
- ❌ Clip generation not fully implemented
- **Location:** `server/routes/media.ts`, `server/ffmpegUtils.ts`

#### 5. Deployment Configuration
- ❌ No Vercel configuration file
- ❌ Build scripts not optimized for production
- ❌ No CI/CD setup

---

## 🔄 Required Updates

### Priority 1: Payment Integration - Pesapal

#### A. Backend Changes

**Create Pesapal Service** (`server/services/pesapal.ts`)
```typescript
interface PesapalConfig {
  consumerKey: string;
  consumerSecret: string;
  environment: 'sandbox' | 'production';
}

class PesapalService {
  // Initialize Pesapal SDK
  // Create payment request
  // Handle IPN callbacks
  // Verify transactions
}
```

**Create Payment Routes** (`server/routes/payments.ts`)
- `POST /api/payments/create-checkout` - Initiate Pesapal transaction
- `POST /api/payments/ipn` - Pesapal IPN callback handler
- `GET /api/payments/verify/:transactionId` - Verify payment status

**Update Package Dependencies**
```json
{
  "dependencies": {
    "pesapal-js": "^latest",  // Add
    // Remove or keep Stripe as optional
  }
}
```

**Files to Modify:**
1. `server/index.ts` - Remove Stripe initialization (lines 60-61, 76-132)
2. `server/models/Transaction.ts` - Add Pesapal fields
3. `server/routes/payments.ts` - Create new file

#### B. Frontend Changes

**Update CoinStore Component** (`src/components/CoinStore.tsx`)
- Replace Stripe checkout flow (lines 45-68)
- Update payment endpoint to `/api/payments/create-checkout`
- Update UI text from "Stripe" to "Pesapal" or generic "Secure Payment"
- Add Pesapal redirect handler

**Files to Modify:**
1. `src/components/CoinStore.tsx` - Lines 49, 58, 91

---

### Priority 2: Environment Configuration

#### Production Environment Variables

**Frontend (`.env.production`)**
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Backend API
VITE_API_URL=https://your-api-domain.com

# Gemini AI
VITE_GEMINI_API_KEY=your_gemini_key
```

**Backend (`.env.production` or Vercel Environment Variables)**
```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/nativecodex?retryWrites=true&w=majority

# JWT
JWT_SECRET=your_secure_jwt_secret_min_32_chars

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Pesapal
PESAPAL_CONSUMER_KEY=your_pesapal_consumer_key
PESAPAL_CONSUMER_SECRET=your_pesapal_consumer_secret
PESAPAL_ENVIRONMENT=production  # or sandbox for testing

# Frontend URLs (for CORS)
FRONTEND_URL=https://your-vercel-app.vercel.app

# Port (for local/docker)
PORT=5000
```

**Files to Create/Update:**
1. `.env.example` - Update with new variables
2. `.env.production` - Create for production builds
3. `server/index.ts` - Update CORS origins to use environment variable

---

### Priority 3: File Upload Integration

#### Firebase Storage Integration

**Update Upload Service** (`src/services/fileUpload.ts` - Create New)
```typescript
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadToFirebase(
  file: File,
  path: string,
  onProgress: (progress: number) => void
): Promise<string> {
  const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      },
      (error) => reject(error),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
}
```

**Update Backend Service** (`src/services/realBackend.ts`)
- Replace mock upload (lines 115-124) with Firebase Storage call
- Use the new `uploadToFirebase` function

**Firebase Storage Rules** (Configure in Firebase Console)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /public/{allPaths=**} {
      allow read;
      allow write: if request.auth != null;
    }
  }
}
```

**Files to Create/Update:**
1. `src/services/fileUpload.ts` - Create new file
2. `src/services/realBackend.ts` - Update uploadAsset function
3. Firebase Console - Configure Storage rules

---

### Priority 4: Deployment Configuration - Vercel

#### Frontend Deployment (Vercel)

**Create `vercel.json`**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "env": {
    "VITE_FIREBASE_API_KEY": "@firebase-api-key",
    "VITE_FIREBASE_AUTH_DOMAIN": "@firebase-auth-domain",
    "VITE_FIREBASE_PROJECT_ID": "@firebase-project-id",
    "VITE_FIREBASE_STORAGE_BUCKET": "@firebase-storage-bucket",
    "VITE_FIREBASE_MESSAGING_SENDER_ID": "@firebase-messaging-sender-id",
    "VITE_FIREBASE_APP_ID": "@firebase-app-id",
    "VITE_API_URL": "@api-url",
    "VITE_GEMINI_API_KEY": "@gemini-api-key"
  }
}
```

**Update Package.json Scripts**
```json
{
  "scripts": {
    "dev": "vite",
    "server": "tsx server/index.ts",
    "build": "vite build",
    "preview": "vite preview",
    "build:frontend": "vite build",
    "build:server": "tsc -p tsconfig.server.json"
  }
}
```

#### Backend Deployment Options

**Option 1: Vercel Serverless Functions** (Recommended for smaller scale)

Create `api/` directory structure:
```
api/
  ├── auth/
  │   └── [...auth].ts
  ├── users/
  │   └── [...users].ts
  └── index.ts
```

**Option 2: Separate Backend Hosting** (Recommended for production)
- Deploy to Render.com, Railway.app, or AWS
- Update `VITE_API_URL` to point to backend URL
- Configure CORS to accept frontend URL

**Files to Create:**
1. `vercel.json` - Vercel configuration
2. `tsconfig.server.json` - TypeScript config for backend build (if needed)

---

### Priority 5: Security Hardening

#### Backend Security Updates

**Update CORS Configuration** (`server/index.ts`)
```typescript
const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({ 
  origin: allowedOrigins, 
  credentials: true 
}));
```

**Add Rate Limiting**
```bash
npm install express-rate-limit
```

**Update server/index.ts**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

**Add Helmet for Security Headers**
```bash
npm install helmet
```

```typescript
import helmet from 'helmet';
app.use(helmet());
```

**Environment Variable Validation** (Create `server/config/validateEnv.ts`)
```typescript
export function validateEnvironment() {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'PESAPAL_CONSUMER_KEY',
    'PESAPAL_CONSUMER_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

**Files to Create/Update:**
1. `server/index.ts` - Add security middleware
2. `server/config/validateEnv.ts` - Create validation
3. `package.json` - Add dependencies

---

### Priority 6: MongoDB Atlas Configuration

#### Current State
- Currently falls back to `mongodb://localhost:27017/nativecodex`
- Needs production MongoDB Atlas connection

#### Steps to Configure

1. **Create MongoDB Atlas Cluster**
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Create free tier cluster
   - Set up database user
   - Whitelist Vercel IP ranges (or use 0.0.0.0/0 for development)

2. **Update Connection String**
   - Get connection string from Atlas
   - Add to `.env.production` or Vercel environment variables
   - Format: `mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>`

3. **Update Fallback Logic** (`server/index.ts`, line 38)
```typescript
// Remove localhost fallback for production
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}
```

**Files to Update:**
1. `server/index.ts` - Line 38
2. `server/config/db.ts` - Line 8
3. `server/seed.ts` - Line 9
4. `server/test_models.ts` - Line 9

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Set up MongoDB Atlas cluster
- [ ] Configure Firebase project (already done)
- [ ] Get Pesapal API credentials
- [ ] Create Vercel account
- [ ] Set up Google OAuth credentials with production URLs

### Backend Deployment

- [ ] Choose backend hosting (Vercel/Render/Railway)
- [ ] Configure environment variables
- [ ] Run database migrations/seed if needed
- [ ] Deploy backend
- [ ] Test API endpoints

### Frontend Deployment

- [ ] Update `VITE_API_URL` to production backend
- [ ] Configure Vercel environment variables
- [ ] Connect Git repository to Vercel
- [ ] Deploy frontend
- [ ] Test authentication flow
- [ ] Test payment flow with Pesapal sandbox

### Post-Deployment

- [ ] Update Google OAuth authorized domains
- [ ] Update Firebase authorized domains
- [ ] Configure Pesapal IPN callback URL
- [ ] Set up monitoring (e.g., Sentry)
- [ ] Test end-to-end user flows
- [ ] Load testing
- [ ] Security audit

---

## 📁 File Modification Summary

### Files to Create (11 files)
1. `server/services/pesapal.ts` - Pesapal integration service
2. `server/routes/payments.ts` - Payment endpoints
3. `src/services/fileUpload.ts` - Firebase Storage integration
4. `server/config/validateEnv.ts` - Environment validation
5. `vercel.json` - Vercel configuration
6. `.env.production` - Production environment variables
7. `tsconfig.server.json` - Backend TypeScript config (optional)
8. `server/middleware/rateLimiter.ts` - Rate limiting middleware
9. `.vercelignore` - Files to exclude from deployment
10. `README.production.md` - Production deployment guide
11. This file: `FEATURE_UPDATES.md`

### Files to Modify (15 files)
1. `server/index.ts` - Remove Stripe, add Pesapal, security middleware, CORS
2. `server/models/Transaction.ts` - Add Pesapal fields
3. `src/components/CoinStore.tsx` - Replace Stripe checkout
4. `src/services/realBackend.ts` - Real file uploads
5. `package.json` - Update dependencies, add scripts
6. `.env.example` - Document all required variables
7. `.gitignore` - Add `.env.production`
8. `server/routes/media.ts` - Implement real media processing
9. `server/ffmpegUtils.ts` - Remove mock URLs
10. `src/services/api.ts` - Update baseURL logic
11. `server/config/db.ts` - Remove localhost fallback
12. `server/seed.ts` - Remove localhost fallback
13. `server/test_models.ts` - Remove localhost fallback
14. `README.md` - Update with production deployment info
15. `docker-compose.yml` - Update for production (optional)

### Files to Delete (3 files - Optional)
1. `src/services/mockBackend.ts` - Not used in production
2. `src/services/mockApi.ts` - Not used in production
3. `server/seedTournaments.js` - Migrate to TypeScript or delete

---

## 🔧 Implementation Order

### Phase 1: Foundation (Week 1)
1. Set up MongoDB Atlas
2. Configure production environment variables
3. Update CORS and security middleware
4. Deploy backend to staging environment

### Phase 2: Payments (Week 1-2)
1. Integrate Pesapal SDK
2. Create payment routes
3. Update CoinStore component
4. Test with Pesapal sandbox

### Phase 3: File Uploads (Week 2)
1. Implement Firebase Storage uploads
2. Update media processing
3. Test upload flows

### Phase 4: Deployment (Week 2-3)
1. Configure Vercel
2. Deploy frontend
3. Connect frontend to backend
4. End-to-end testing

### Phase 5: Verification (Week 3)
1. Security audit
2. Performance testing
3. User acceptance testing
4. Production deployment

---

## 🛡️ Security Considerations

### Critical Security Items

1. **Never commit `.env` files** - Already in `.gitignore`, verify
2. **Use strong JWT secrets** - Minimum 32 characters, random
3. **Enable HTTPS only** - Vercel provides this automatically
4. **Validate all inputs** - Add express-validator middleware
5. **Sanitize database queries** - Mongoose helps, but review
6. **Rate limit sensitive endpoints** - Auth, payments, uploads
7. **Monitor for suspicious activity** - Set up logging/alerting
8. **Keep dependencies updated** - Regular security audits

### Firebase Security Rules

**Firestore Rules** (if using Firestore in future)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

**Storage Rules** - See Priority 3 above

---

## 📊 Monitoring & Analytics

### Recommended Tools

1. **Error Tracking** - Sentry.io
   - Captures frontend and backend errors
   - Real-time alerts

2. **Analytics** - Google Analytics or Mixpanel
   - User behavior tracking
   - Conversion funnels

3. **Performance** - Vercel Analytics
   - Built-in performance monitoring
   - Web Vitals tracking

4. **Uptime** - UptimeRobot or Pingdom
   - Monitor API availability
   - Alert on downtime

---

## 🧪 Testing Strategy

### Backend Testing
```bash
# Add testing framework
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest

# Create test script in package.json
"test": "jest",
"test:watch": "jest --watch"
```

### Frontend Testing
```bash
# Add testing framework
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# Update package.json
"test:unit": "vitest",
"test:ui": "vitest --ui"
```

### Integration Tests
- Test payment flow end-to-end with Pesapal sandbox
- Test authentication with Firebase
- Test file uploads to Firebase Storage
- Test real-time features with Socket.IO

---

## 💡 Additional Recommendations

### Performance Optimization

1. **Code Splitting** - Already using React lazy loading
2. **Image Optimization** - Use Vercel Image Optimization
3. **CDN** - Vercel provides global CDN
4. **Database Indexing** - Add indexes to MongoDB for common queries
5. **Caching** - Implement Redis for session/data caching (future enhancement)

### Scalability Considerations

1. **Socket.IO Scaling** - Use Redis adapter for multi-instance deployments
2. **Database Connection Pooling** - Mongoose handles this
3. **Horizontal Scaling** - Backend can scale with load balancer
4. **Queue System** - For heavy processing (video encoding, etc.)

### User Experience

1. **Loading States** - Already implemented in components
2. **Error Boundaries** - Add React error boundaries
3. **Offline Support** - Consider PWA features
4. **Mobile Responsiveness** - Review and test
5. **Accessibility** - Add ARIA labels, keyboard navigation

---

## 📞 Support & Resources

### Pesapal Documentation
- [Pesapal API Docs](https://developer.pesapal.com/)
- [Pesapal Node.js SDK](https://www.npmjs.com/search?q=pesapal)

### Vercel Documentation  
- [Vercel Deployment](https://vercel.com/docs)
- [Environment Variables](https://vercel.com/docs/environment-variables)
- [Serverless Functions](https://vercel.com/docs/serverless-functions/introduction)

### MongoDB Atlas
- [Getting Started](https://docs.atlas.mongodb.com/getting-started/)
- [Connection Strings](https://docs.mongodb.com/manual/reference/connection-string/)

### Firebase
- [Firebase Console](https://console.firebase.google.com/)
- [Cloud Storage](https://firebase.google.com/docs/storage)
- [Authentication](https://firebase.google.com/docs/auth)

---

## ✅ Next Steps

1. **Review this document** with your team
2. **Prioritize features** based on business needs
3. **Set up development environment** with all necessary accounts
4. **Begin Phase 1** implementation
5. **Test incrementally** after each phase
6. **Schedule production deployment** after successful testing

---

**Document Status:** Ready for Implementation  
**Estimated Timeline:** 2-3 weeks for full production deployment  
**Risk Level:** Medium (requires external service integrations)  
**Impact:** High (enables full platform monetization and deployment)

---

*This document should be updated as implementation progresses. Any changes to architecture or approach should be documented here.*
