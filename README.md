# Bookmark App

A modern, full-stack bookmark management application with real-time synchronization, OAuth authentication, and a beautiful 3D carousel interface.

![Tech Stack](https://img.shields.io/badge/Next.js-15-black)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38bdf8)

## 🚀 Live Demo

[View Live App](https://your-app.vercel.app) *(Replace with your Vercel URL)*

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Approach](#project-approach)
- [Problems Faced & Solutions](#problems-faced--solutions)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Deployment](#deployment)

---

## ✨ Features

### Core Functionality
- **CRUD Operations**: Add, edit, delete, and view bookmarks
- **Real-time Sync**: Changes instantly reflected across all browser tabs using Supabase Realtime
- **Google OAuth**: Secure authentication with Google Sign-In
- **URL Validation**: Backend verification to ensure valid URLs before saving
- **User Isolation**: Row-Level Security (RLS) ensures users only see their own bookmarks

### UI/UX
- **3D Carousel View**: Interactive 3D card carousel for browsing bookmarks
- **Search & Filter**: Real-time search across titles and URLs
- **Dark Mode**: System-synced dark/light theme with localStorage persistence
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Activity Log**: Real-time activity tracking for all CRUD operations
- **Loading States**: Skeleton loaders and spinners for better UX

### Advanced Features
- **Keyboard Shortcuts**: Quick navigation and actions
- **Toast Notifications**: User feedback for all operations
- **Infinite Scroll**: Efficient pagination for large bookmark collections
- **Export/Import**: Backup and restore bookmarks (planned)

---

## 🛠 Tech Stack

### Frontend
- **Next.js 15** (App Router) - React framework with server-side rendering
- **TypeScript** - Type safety and better developer experience
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Embla Carousel** - 3D carousel implementation

### Backend
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Real-time subscriptions
  - Row-Level Security (RLS)
  - OAuth authentication
  - Edge functions for URL validation

### Deployment
- **Vercel** - Frontend hosting with serverless functions
- **Supabase Cloud** - Managed database and auth

---

## 📐 Project Approach

### 1. Initial Setup & Planning
- Defined core requirements: CRUD operations, auth, and real-time sync
- Chose Next.js 15 App Router for modern React patterns and SSR capabilities
- Selected Supabase for rapid backend development without managing infrastructure

### 2. Database Schema Design
```sql
CREATE TABLE bookmarks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
- Simple schema focusing on essential fields
- Foreign key relationship with Supabase auth users
- Timestamp tracking for sorting and display

### 3. Authentication Flow
- Implemented Google OAuth via Supabase Auth
- Created separate login page with redirect handling
- Auth state management across client and server components
- Protected routes with middleware

### 4. Real-time Implementation
- Initially struggled with Supabase Realtime subscriptions triggering for all users
- **Solution**: Filtered realtime events by `user_id` in the client-side logic
- Used PostgreSQL triggers for instant UI updates
- Channel cleanup on component unmount to prevent memory leaks

### 5. UI Development
- Started with basic CRUD interface
- Iteratively enhanced with dark mode, activity logs, and search
- Added 3D carousel for visual appeal
- Implemented skeleton loaders for better perceived performance

### 6. Backend Validation
- Created Edge Function (`validate-url`) to verify URLs server-side
- Prevented invalid/malicious URLs from being saved
- Added error handling and user feedback

### 7. Deployment & Production
- Environment variable configuration for local and production
- OAuth redirect URL setup for Vercel domain
- Database migrations and RLS policy deployment
- Performance optimization (memoization, lazy loading)

---

## 🐛 Problems Faced & Solutions

### Problem 1: Realtime Updates Triggering for All Users
**Issue**: When any user added a bookmark, all logged-in users received the update, causing bookmarks to appear in wrong accounts.

**Root Cause**: Supabase Realtime subscription was listening to the entire `bookmarks` table without user-specific filtering.

**Solution**: 
```typescript
// ❌ Wrong: Listens to all changes
.on('postgres_changes', { event: '*', schema: 'public', table: 'bookmarks' }, ...)

// ✅ Correct: Filter by user_id in the payload
.on('postgres_changes', { event: '*', schema: 'public', table: 'bookmarks' }, (payload) => {
  if (payload.new?.user_id === currentUserId) {
    load();
  }
})
```

**Lesson Learned**: Always validate and filter realtime events on the client side, even with RLS enabled.

---

### Problem 2: OAuth Redirect URL Mismatch
**Issue**: Google OAuth login worked locally but failed on Vercel with "Invalid redirect URL" error.

**Root Cause**: Supabase Auth was configured with only `localhost:3000` redirect URLs.

**Solution**:
1. Added Vercel production URL to Supabase → Authentication → URL Configuration
2. Set environment variable `NEXT_PUBLIC_SITE_URL` in Vercel
3. Updated login code to dynamically use the correct redirect URL:
```typescript
const redirectTo = process.env.NEXT_PUBLIC_SITE_URL 
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
  : 'http://localhost:3000/auth/callback';
```

---

### Problem 3: Supabase Client Initialization in Server Components
**Issue**: `createClient()` from `@supabase/supabase-js` caused errors in Next.js Server Components.

**Root Cause**: Server and browser environments require different Supabase client configurations.

**Solution**: Created separate utility files:
- `utils/supabase/browser.ts` - Client components
- `utils/supabase/server.ts` - Server components (with cookies)

---

### Problem 4: Dark Mode Not Syncing Across Tabs
**Issue**: Toggling dark mode in one tab didn't update other tabs.

**Solution**: Used `localStorage` with `storage` event listener:
```typescript
// Dispatch custom storage event
window.dispatchEvent(new StorageEvent('storage', { 
  key: 'darkMode', 
  newValue: String(next) 
}));

// Listen in all tabs
window.addEventListener('storage', handleStorage);
```

---

### Problem 5: Realtime Channel Not Cleaning Up Properly
**Issue**: Memory leaks and duplicate subscriptions when component re-rendered.

**Root Cause**: Channel wasn't being removed properly on unmount.

**Solution**:
```typescript
useEffect(() => {
  let channel: any = null;

  const init = async () => {
    channel = supabase.channel('bookmarks').on(...).subscribe();
  };

  init();

  return () => {
    if (channel) supabase.removeChannel(channel);
  };
}, [supabase]);
```

---

### Problem 6: TypeScript Errors with Supabase Types
**Issue**: Type mismatches when querying Supabase database.

**Solution**: 
- Generated types from database schema: `npx supabase gen types typescript`
- Created explicit `Bookmark` interface in component
- Used type assertions: `as Bookmark[]` where needed

---

### Problem 7: URL Validation Security
**Issue**: Users could save malicious or invalid URLs.

**Solution**: Created Supabase Edge Function to validate URLs before insertion:
```typescript
// Edge Function: validate-url
const response = await fetch(url, { method: 'HEAD' });
if (!response.ok) {
  return new Response('Invalid URL', { status: 400 });
}
```

---

## 🤖 Use of AI/LLM

**Limited Assistance**: 
- Used for quick syntax lookups and debugging specific errors
- Generated initial Tailwind CSS color schemes
- Helped with PostgreSQL RLS policy syntax
- **Did NOT use** for core logic, architecture decisions, or extensive code generation
- All design patterns, problem-solving, and implementation were manually developed

---

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm/yarn
- Supabase account
- Google OAuth credentials (for authentication)

### Steps

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/bookmark-app.git
cd bookmark-app
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Set up environment variables**

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. **Set up Supabase database**

Run this SQL in Supabase SQL Editor:
```sql
-- Create bookmarks table
CREATE TABLE bookmarks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks"
  ON bookmarks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;
```

5. **Configure Google OAuth**

- Go to Supabase Dashboard → Authentication → Providers → Google
- Enable Google provider
- Add your Google OAuth credentials (from Google Cloud Console)

6. **Run development server**
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🌐 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` |
| `NEXT_PUBLIC_SITE_URL` | Production URL (for OAuth) | `https://app.vercel.app` |

---

## 🗄 Database Setup

### Schema
```sql
bookmarks
├── id (BIGINT, PRIMARY KEY)
├── user_id (UUID, FOREIGN KEY → auth.users)
├── url (TEXT)
├── title (TEXT)
└── created_at (TIMESTAMPTZ)
```

### Row-Level Security Policies
- **SELECT**: Users can only read their own bookmarks
- **INSERT**: Users can only create bookmarks for themselves
- **UPDATE**: Users can only edit their own bookmarks
- **DELETE**: Users can only delete their own bookmarks

---

## 🚢 Deployment

### Deploy to Vercel

1. **Push to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Connect to Vercel**
- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Add environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SITE_URL` (use your Vercel URL)

3. **Update Supabase OAuth URLs**
- Go to Supabase → Authentication → URL Configuration
- Add your Vercel URL to **Redirect URLs**:
  - `https://your-app.vercel.app/auth/callback`
  - `https://your-app.vercel.app/*`

4. **Deploy**
- Click "Deploy" in Vercel
- Wait for build to complete
- Test authentication on production URL

---

## 📝 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main bookmarks page
│   ├── login/
│   │   └── page.tsx          # Login page
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts      # OAuth callback handler
│   └── layout.tsx            # Root layout
├── utils/
│   └── supabase/
│       ├── browser.ts        # Browser Supabase client
│       └── server.ts         # Server Supabase client
└── styles/
    └── globals.css           # Global styles + Tailwind
```

---

## 🔮 Future Enhancements

- [ ] Browser extension for one-click bookmark saving
- [ ] Tag/category system for organization
- [ ] Export bookmarks to JSON/CSV
- [ ] Import from browser bookmarks
- [ ] Bookmark folders/collections
- [ ] Collaborative bookmark sharing
- [ ] AI-powered bookmark suggestions
- [ ] Full-text search with PostgreSQL
- [ ] Bookmark previews with screenshots
- [ ] Analytics dashboard

---

## 📄 License

MIT License - feel free to use this project for learning or production.

---

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- **Supabase** for the amazing BaaS platform
- **Vercel** for seamless deployment
- **Next.js team** for the excellent framework
- **Tailwind CSS** for rapid UI development

---

**⭐ If you found this project helpful, please give it a star!**
