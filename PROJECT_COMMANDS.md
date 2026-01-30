# PlayNative Project Control Commands

Complete reference for managing your PlayNative application.

---

## 🚀 Quick Start Commands

```bash
# Start everything (in separate terminals)
npm run dev          # Frontend (port 3000)
npm run server       # Backend (port 5000)
sudo systemctl start mongod  # Database
```

---

## 📦 NPM Commands

### Development
```bash
npm run dev          # Start frontend development server (Vite)
npm run server       # Start backend server (tsx with hot reload)
npm run build        # Build frontend for production
npm run preview      # Preview production build locally
```

### Package Management
```bash
npm install          # Install all dependencies
npm install <package>     # Add new package
npm install -D <package>  # Add dev dependency
npm uninstall <package>   # Remove package
npm update           # Update all packages
npm outdated         # Check for outdated packages
npm cache clean --force   # Clear npm cache
```

### Troubleshooting
```bash
rm -rf node_modules package-lock.json  # Full reset
npm install                             # Reinstall everything
```

---

## 🗄️ MongoDB Commands

### Service Control (System-wide)
```bash
# Start MongoDB
sudo systemctl start mongod

# Stop MongoDB
sudo systemctl stop mongod

# Restart MongoDB
sudo systemctl restart mongod

# Check status
sudo systemctl status mongod

# Enable auto-start on boot
sudo systemctl enable mongod

# Disable auto-start
sudo systemctl disable mongod
```

### MongoDB Shell (mongosh)
```bash
# Connect to database
mongosh nativecodex

# Connect with specific host/port
mongosh --host localhost --port 27017

# Connect and run a command
mongosh nativecodex --eval "db.users.find()"
```

### Database Operations
```bash
# Inside mongosh shell:

# Show all databases
show dbs

# Use/switch to database
use nativecodex

# Show all collections (tables)
show collections

# Drop entire database (CAREFUL!)
db.dropDatabase()
```

### Collection (Table) Operations
```bash
# Create collection
db.createCollection("users")

# Drop collection
db.users.drop()

# Rename collection
db.users.renameCollection("players")

# Get collection stats
db.users.stats()
```

### Data Queries
```bash
# Find all documents
db.users.find()

# Find with pretty formatting
db.users.find().pretty()

# Find one document
db.users.findOne()

# Find with filter
db.users.find({ email: "sheldonramu8@gmail.com" })

# Find with multiple conditions
db.users.find({ tier: "FREE", isOnline: true })

# Count documents
db.users.countDocuments()
db.users.countDocuments({ tier: "PREMIUM" })

# Find with projection (select specific fields)
db.users.find({}, { email: 1, username: 1, _id: 0 })

# Sort results
db.users.find().sort({ createdAt: -1 })  # -1 = descending, 1 = ascending

# Limit results
db.users.find().limit(10)

# Skip and limit (pagination)
db.users.find().skip(10).limit(10)
```

### Data Modification
```bash
# Insert one document
db.users.insertOne({
  username: "TestUser",
  email: "test@example.com",
  tier: "FREE"
})

# Insert multiple documents
db.users.insertMany([
  { username: "User1", email: "user1@example.com" },
  { username: "User2", email: "user2@example.com" }
])

# Update one document
db.users.updateOne(
  { email: "sheldonramu8@gmail.com" },
  { $set: { hasCompletedOnboarding: true } }
)

# Update multiple documents
db.users.updateMany(
  { tier: "FREE" },
  { $set: { codeBits: 1000 } }
)

# Replace entire document
db.users.replaceOne(
  { email: "test@example.com" },
  { username: "NewUser", email: "new@example.com" }
)

# Delete one document
db.users.deleteOne({ email: "test@example.com" })

# Delete multiple documents
db.users.deleteMany({ tier: "FREE", isOnline: false })

# Delete all documents (CAREFUL!)
db.users.deleteMany({})
```

### Advanced Operators
```bash
# Increment/Decrement
db.users.updateOne(
  { email: "sheldonramu8@gmail.com" },
  { $inc: { codeBits: 500 } }  # Add 500
)

# Add to array
db.users.updateOne(
  { email: "sheldonramu8@gmail.com" },
  { $push: { followers: "user_id_here" } }
)

# Remove from array
db.users.updateOne(
  { email: "sheldonramu8@gmail.com" },
  { $pull: { followers: "user_id_here" } }
)

# Set field only if it doesn't exist
db.users.updateOne(
  { email: "sheldonramu8@gmail.com" },
  { $setOnInsert: { createdAt: new Date() } },
  { upsert: true }
)
```

### Useful One-Liners
```bash
# From terminal (without entering mongosh):

# View your user data
mongosh nativecodex --eval "db.users.findOne({email: 'sheldonramu8@gmail.com'})"

# Count all users
mongosh nativecodex --eval "db.users.countDocuments()"

# Update onboarding status
mongosh nativecodex --eval "db.users.updateOne({email: 'sheldonramu8@gmail.com'}, {\$set: {hasCompletedOnboarding: true}})"

# Grant admin access
mongosh nativecodex --eval "db.users.updateOne({email: 'sheldonramu8@gmail.com'}, {\$set: {isAdmin: true}})"

# Add CodeBits
mongosh nativecodex --eval "db.users.updateOne({email: 'sheldonramu8@gmail.com'}, {\$inc: {codeBits: 10000}})"

# List all collections
mongosh nativecodex --eval "db.getCollectionNames()"

# Backup database
mongodump --db nativecodex --out ~/backup/$(date +%Y%m%d)

# Restore database
mongorestore --db nativecodex ~/backup/20260123/nativecodex
```

---

## 🔧 Process Management

### Kill Running Processes
```bash
# Kill all node processes
pkill node

# Kill specific process by name
pkill -f "tsx server/index.ts"
pkill -f "vite"

# Find process using port 5000
lsof -i :5000

# Kill process on specific port
kill -9 $(lsof -t -i:5000)

# Find all node processes
ps aux | grep node
```

### Check Running Servers
```bash
# Check if MongoDB is running
systemctl status mongod

# Check ports in use
sudo netstat -tulpn | grep LISTEN

# Check what's running on port 3000 and 5000
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :5000
```

---

## 🔐 Environment Variables

### Edit `.env.local`
```bash
nano .env.local
# or
code .env.local
```

### Required Variables
```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/nativecodex

# JWT
JWT_SECRET=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Pesapal (Optional - for payments)
PESAPAL_CONSUMER_KEY=your-key
PESAPAL_CONSUMER_SECRET=your-secret
PESAPAL_ENVIRONMENT=sandbox

# Server
PORT=5000
NODE_ENV=development
```

---

## 📊 Database Seeding & Reset

### Reset User to Default State
```bash
mongosh nativecodex --eval "
  db.users.updateOne(
    {email: 'sheldonramu8@gmail.com'},
    {\$set: {
      hasCompletedOnboarding: true,
      codeBits: 10000,
      tier: 'PREMIUM',
      isAdmin: true,
      'stats.rating': 1500
    }}
  )
"
```

### Create Test Data
```bash
# Create test tournament
mongosh nativecodex --eval "
  db.tournaments.insertOne({
    name: 'Test Championship',
    game: 'Valorant',
    prize: '10,000 BITS',
    startDate: new Date(),
    status: 'REGISTRATION',
    maxParticipants: 64,
    currentParticipants: 12
  })
"
```

---

## 🐛 Debugging Commands

### View Logs
```bash
# MongoDB logs
sudo journalctl -u mongod -f

# Application logs (if using PM2)
pm2 logs

# View last 50 lines of MongoDB log
sudo tail -50 /var/log/mongodb/mongod.log
```

### MongoDB Diagnostics
```bash
# Check database size
mongosh nativecodex --eval "db.stats()"

# Check specific collection size
mongosh nativecodex --eval "db.users.stats()"

# Verify indexes
mongosh nativecodex --eval "db.users.getIndexes()"

# Check server status
mongosh --eval "db.serverStatus()"
```

---

## 🔄 Common Workflows

### Restart Everything
```bash
sudo systemctl restart mongod
pkill -f "tsx server/index.ts"
pkill -f "vite"
npm run dev &
npm run server &
```

### Fresh Start After Code Changes
```bash
# Just restart servers (keep MongoDB running)
pkill -f "tsx server/index.ts"
npm run server
```

### Complete Database Reset (NUCLEAR OPTION)
```bash
# CAREFUL - This deletes EVERYTHING!
mongosh nativecodex --eval "db.dropDatabase()"
sudo systemctl restart mongod
npm run server  # Will recreate collections on first connection
```

---

## 📝 Git Commands (Bonus)

```bash
# Save your work
git add .
git commit -m "Your message here"
git push

# Create new branch
git checkout -b feature-name

# Check status
git status

# View changes
git diff

# Undo changes (CAREFUL!)
git reset --hard HEAD
```

---

## 🆘 Emergency Fixes

### Server Won't Start (Port in Use)
```bash
pkill -f "tsx server/index.ts"
npm run server
```

### MongoDB Won't Connect
```bash
sudo systemctl restart mongod
sudo systemctl status mongod
```

### Frontend Won't Load
```bash
pkill -f "vite"
npm run dev
```

### Complete System Freeze (from previous conversation)
```bash
# Check memory
free -h

# Check swap
swapon --show

# If needed, increase swap (already done)
sudo swapon /swapfile
```

---

**💡 Pro Tips:**

1. **Always run MongoDB first** before starting the backend server
2. **Use `Ctrl+C`** to gracefully stop servers (don't just close terminal)
3. **Check ports** if you get "address already in use" errors
4. **Backup before major changes**: `mongodump --db nativecodex --out ~/backup/$(date +%Y%m%d)`
5. **Use `mongosh --eval` for quick queries** without entering the shell

---

**🔖 Bookmark This File!**

Keep this file open in a tab or pin it to your desktop for quick reference.
