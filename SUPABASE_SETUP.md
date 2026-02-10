# Supabase Backend Migration Guide

## Quick Start

### 1. Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and project name
4. Set a strong database password (save it!)
5. Select region closest to your users
6. Wait for project to initialize (~2 minutes)

### 2. Set Up Database Schema
1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the contents of `supabase-schema.sql` from your project root
4. Paste into the SQL editor
5. Click **Run** to create all tables

### 3. Get API Credentials
1. Go to **Settings** > **API**
2. Copy the **Project URL**
3. Copy the **anon/public** key (NOT the service_role key)

### 4. Configure Your App
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Edit `.env.local` and paste your credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 5. Restart Dev Server
```bash
npm run dev
```

## Migration from localStorage

The app will automatically detect if Supabase is configured. If not, it falls back to localStorage.

To migrate existing data:
1. Export from localStorage (browser console):
   ```javascript
   const data = {
       students: localStorage.getItem('tutor_students'),
       bookings: localStorage.getItem('tutor_bookings'),
       slots: localStorage.getItem('tutor_slots')
   };
   console.log(JSON.stringify(data, null, 2));
   ```
2. Copy the output
3. Use Supabase Dashboard > Table Editor to manually insert records

## Next Steps

After setup, the following features will work across devices:
- ✅ Student accounts with email/password
- ✅ Real-time chat updates
- ✅ Persistent bookings
- ✅ Multi-device access
- ✅ Automatic data sync

## Troubleshooting

**Error: "Invalid API key"**
- Check that you copied the anon/public key, not service_role
- Verify no extra spaces in .env.local

**Error: "relation does not exist"**
- Run the SQL schema in Supabase SQL Editor
- Check that all tables were created successfully

**Data not syncing**
- Check browser console for errors
- Verify RLS policies are enabled
- Check network tab for failed requests
