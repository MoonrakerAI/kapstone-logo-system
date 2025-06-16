# Kapstone Logo System - Production Setup

## Critical Issue: Data Persistence

Currently, your clinics disappear after logout because there's no database configured in production. The system is using temporary memory storage.

## Solution: Configure MongoDB Atlas (Free Tier)

1. **Create MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for free account
   - Create a new cluster (M0 free tier is sufficient)

2. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)

3. **Add to Vercel Environment Variables**
   - Go to https://vercel.com/dashboard
   - Select your project: kapstone-logo-system
   - Go to Settings → Environment Variables
   - Add: `MONGODB_URI` = your connection string
   - Replace `<password>` with your actual password
   - Add `/kapstone-logos` to the end of the URI

4. **Redeploy**
   - Vercel will automatically redeploy with the new environment variable
   - Your data will now persist!

## Alternative: Vercel KV Storage

If you prefer Vercel's built-in storage:

1. Go to your Vercel project
2. Click "Storage" tab
3. Create a KV database
4. Copy the environment variables it provides
5. They'll be automatically added to your project

## Quick Test

After setup:
1. Add a clinic in admin
2. Log out and log back in
3. The clinic should still be there!

## Environment Variables Needed

```
MONGODB_URI=mongodb+srv://your-connection-string
JWT_SECRET=generate-a-random-string-here
```

## Support

If clinics are still disappearing after MongoDB setup, check:
- MongoDB connection string is correct
- Database user has read/write permissions
- Vercel logs for connection errors