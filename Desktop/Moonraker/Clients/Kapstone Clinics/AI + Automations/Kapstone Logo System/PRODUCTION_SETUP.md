# Production Setup Guide for Kapstone Logo System

This guide will help you deploy a production-ready logo distribution system that can handle hundreds of clinics with reliable data persistence.

## Prerequisites

1. Vercel account with a project deployed
2. MongoDB Atlas account (optional, but recommended)
3. Vercel KV or Redis for reliable data storage

## Step 1: Set Up Vercel KV Storage (Required)

Vercel KV provides serverless-compatible Redis storage that persists across function invocations.

1. Go to your Vercel project dashboard
2. Navigate to the "Storage" tab
3. Click "Create Database" → "KV"
4. Choose your region (select closest to your users)
5. Click "Create"

Vercel will automatically add these environment variables:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

## Step 2: Configure Environment Variables

In your Vercel project settings, add these environment variables:

```
# MongoDB (optional but recommended for data backup)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kapstone-logos

# JWT Secret for admin authentication
JWT_SECRET=your-secure-random-string-here

# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$... (use bcrypt to hash your password)

# Optional: Email service for notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

## Step 3: Deploy the Updated System

```bash
# Commit all changes
git add .
git commit -m "Add production-ready KV storage and optimized widget"

# Push to GitHub
git push origin master

# Deploy to Vercel
vercel --prod
```

## Step 4: Test the Setup

Run the setup verification script:

```bash
npm run setup:kv
```

This will verify that KV storage is properly configured.

## Step 5: Use the New Widget Endpoint

The new production-ready widget endpoint is:
```
https://your-domain.vercel.app/widget-v2/logo/[CLINIC_ID]
```

Update your admin interface to use this new endpoint:

```javascript
const embedCode = `<script src="https://your-domain.vercel.app/widget-v2/logo/${clinicId}"></script>`;
```

## Production Features

### 1. Reliable Data Storage
- Primary: Vercel KV (Redis-compatible, serverless-optimized)
- Backup: MongoDB Atlas (for data export and analytics)
- Fallback: In-memory storage (development only)

### 2. Optimized Widget Performance
- Direct KV queries (no MongoDB connection overhead)
- Minified JavaScript output
- 5-minute cache headers
- Static logo serving via CDN

### 3. Automatic Failover
- If KV is unavailable, falls back to MongoDB
- If MongoDB is unavailable, uses memory store
- Graceful error handling with fallback UI

### 4. Scalability
- Can handle thousands of concurrent widget loads
- No connection pool limitations
- Automatic scaling with Vercel

### 5. Monitoring
- Check system health: `https://your-domain.vercel.app/widget-v2/health`
- Monitor KV usage in Vercel dashboard
- Track widget impressions in the database

## Troubleshooting

### Widget Not Loading
1. Check clinic exists: Query KV store or admin panel
2. Verify clinic status is "approved"
3. Check browser console for errors
4. Test health endpoint

### Data Not Persisting
1. Verify KV environment variables are set
2. Check Vercel logs for connection errors
3. Run setup script to test KV connection

### Performance Issues
1. Ensure logos are served from `/logos/` (CDN path)
2. Check widget cache headers
3. Monitor KV latency in Vercel dashboard

## Migration from Old System

If you have existing clinics in MongoDB:

```javascript
// One-time migration script
const mongoose = require('mongoose');
const kvStore = require('./backend/storage/kvStore');
const Clinic = require('./backend/models/Clinic');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  const clinics = await Clinic.find({});
  
  for (const clinic of clinics) {
    await kvStore.saveClinic(clinic);
    console.log(`Migrated: ${clinic.clinicId}`);
  }
  
  console.log(`Migrated ${clinics.length} clinics to KV store`);
}

migrate().catch(console.error);
```

## Best Practices

1. **Always use the widget-v2 endpoint** for new implementations
2. **Monitor KV usage** to stay within limits
3. **Set up alerts** for high error rates
4. **Regular backups** - export data from MongoDB periodically
5. **Test thoroughly** before switching existing clinics

## Support

For issues:
1. Check Vercel function logs
2. Verify KV storage status
3. Test with the health endpoint
4. Review browser console errors

The system is now production-ready and can reliably serve logos to hundreds of clinic websites simultaneously.