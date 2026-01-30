# Quick Start - Server Debugging

## If you're seeing server errors, follow these steps:

### 1. Check your .env.local file exists
Your `.env.local` should have at minimum:

```bash
# Required for server to start
MONGODB_URI=mongodb://localhost:27017/nativecodex
JWT_SECRET=dev_jwt_secret_change_this_in_production_min32chars

# Optional (will warn but server will start)
PESAPAL_CONSUMER_KEY=your_pesapal_consumer_key_here
PESAPAL_CONSUMER_SECRET=your_pesapal_consumer_secret_here
PESAPAL_ENVIRONMENT=sandbox
PESAPAL_IPN_URL=http://localhost:5000/api/payments/ipn
```

### 2. Copy the example file
```bash
cp .env.local.example .env.local
```

### 3. Start MongoDB locally (if using local)
```bash
# Using Docker
docker-compose up -d

# Or start MongoDB service on Windows
# MongoDB should be running on localhost:27017
```

### 4. Try starting the server again
```bash
npm run server
```

## Common Errors:

### "Missing required environment variables"
- Copy `.env.local.example` to `.env.local`
- Fill in at least `MONGODB_URI` and `JWT_SECRET`

### "MongoDB connection error"
- Make sure MongoDB is running locally OR
- Use MongoDB Atlas connection string

### "Cannot find module"
- Run `npm install` to install allpackages

### Pesapal warnings
- These are OK in development!
- Server will start but payments won't work until you add real Pesapal credentials
