# PhishGuard

A web game that teaches users to spot phishing emails and protect themselves online.

## Quick Start (Local Development)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. **Create a Supabase project:**
   - Go to [supabase.com](https://supabase.com)
   - Sign up/login and create a new project
   - Wait for the project to finish setting up (~2 minutes)

2. **Get your credentials:**
   - In your Supabase project, go to **Settings** → **API**
   - Copy your **Project URL** and **anon/public key**

3. **Set up environment variables:**
   ```bash
   # Create .env.local file
   touch .env.local
   ```
   
   Add these lines to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

4. **Set up the database:**
   - In Supabase, go to **SQL Editor**
   - Click **New Query**
   - Copy and paste the entire contents of `supabase-setup.sql`
   - Click **Run** (or press Cmd/Ctrl + Enter)
   - You should see "Success. No rows returned"

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Test It Out

1. Click **Get Started** on the home page
2. Sign up with an email and password
3. You'll be redirected to the game
4. Start playing!

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Supabase** (Auth + Postgres with RLS)
- **Vercel** (Deployment)

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

## Troubleshooting

**"Invalid API key" error:**
- Double-check your `.env.local` file has the correct values
- Make sure you're using the **anon/public** key, not the service role key
- Restart your dev server after changing `.env.local`

**Database errors:**
- Make sure you ran the `supabase-setup.sql` script completely
- Check the Supabase SQL Editor for any error messages
- Verify RLS policies were created (Settings → Authentication → Policies)

**Port already in use:**
```bash
# Use a different port
npm run dev -- -p 3001
```

## Deployment

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add your environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

## License

MIT
