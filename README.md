<<<<<<< HEAD
This is a new edit I made.


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
=======
# PhishGuard
>>>>>>> 4da0fb4 (update all latest features)

A web game that teaches users to spot phishing emails and protect themselves online.

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Supabase** (Auth + Postgres with RLS)
- **Vercel** (Deployment)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your credentials
3. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

4. Run the SQL setup script in your Supabase SQL Editor:
   - Open your Supabase project
   - Go to SQL Editor
   - Copy and paste the contents of `supabase-setup.sql`
   - Run the script

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- ✅ User authentication (sign up/sign in)
- ✅ Interactive game with phishing and legitimate emails
- ✅ Verdict modal with explanations and red flags
- ✅ Score tracking and leaderboard
- ✅ Educational resources page
- ✅ Responsive design with dark mode support

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   ├── auth/             # Authentication page
│   ├── play/             # Game page
│   ├── leaderboard/      # Leaderboard page
│   ├── resources/        # Resources page
│   └── layout.tsx        # Root layout
├── components/           # React components
├── data/                 # Game data (emails)
├── lib/                  # Utilities (Supabase clients)
└── types/                # TypeScript types
```

## Database Schema

- `profiles` - User profiles
- `game_sessions` - Game session data
- `leaderboard` - Leaderboard entries

See `supabase-setup.sql` for full schema and RLS policies.

## Deployment

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add your environment variables in Vercel project settings
4. Deploy!

## License

MIT
