# PhishGuard

A web game that teaches users to spot phishing emails and protect themselves online. Players analyze emails and guess whether they're legitimate or phishing attempts, earning points and building streaks while learning about cybersecurity.

## Features

- 🎮 **Interactive Gameplay** - Analyze real-world email examples and test your phishing detection skills
- 📊 **Score Tracking** - Earn points for correct guesses, with bonus points for streaks
- 🏆 **Leaderboard** - Compete with other players and see how you rank
- 📚 **Educational Resources** - Learn about phishing red flags and how to protect yourself
- 🔐 **Secure Authentication** - Built with Supabase Auth for secure user management
- 🌙 **Dark Mode** - Full dark mode support for comfortable gameplay

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Modern styling
- **Supabase** - Authentication and PostgreSQL database with Row Level Security
- **Vercel** - Deployment platform

## Quick Start

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd phishguard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Get your project URL and anon key from Settings → API
   - Create `.env.local`:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     ```

4. **Set up database**
   - Follow the instructions in `TABLE-SETUP.md` to create tables
   - Run `complete-setup.sql` in Supabase SQL Editor
   - Run `emails-table-setup.sql` for the emails table
   - Seed emails: `npm run seed:emails` (requires `.env.seed` with service role key)

5. **Run development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
phishguard/
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── emails/       # Email fetching
│   │   │   ├── guess/        # Guess submission
│   │   │   ├── leaderboard/  # Leaderboard updates
│   │   │   └── auth/         # Authentication
│   │   ├── auth/             # Login/signup page
│   │   ├── play/             # Main game page
│   │   ├── leaderboard/         # Leaderboard display
│   │   └── resources/        # Educational content
│   ├── components/           # React components
│   ├── lib/                  # Utilities (Supabase clients)
│   ├── types/                # TypeScript type definitions
│   └── data/                 # Seed data
├── scripts/                  # Utility scripts (seeding)
└── *.sql                     # Database setup scripts
```

## API Routes

### `GET /api/emails/next`
Returns the next unseen email for the authenticated user.

**Headers:**
- `Authorization: Bearer <userId>`

**Response:**
```json
{
  "id": "uuid",
  "subject": "Email subject",
  "from_name": "Sender name",
  "from_email": "sender@example.com",
  "body_html": "Email body",
  "difficulty": "easy|medium|hard"
}
```
Or `{ "done": true }` if no emails left.

### `POST /api/guess`
Submit a guess for an email.

**Headers:**
- `Authorization: Bearer <userId>`

**Body:**
```json
{
  "emailId": "uuid",
  "guess": true  // true = phishing, false = legitimate
}
```

**Response:**
```json
{
  "correct": true,
  "pointsDelta": 1,
  "explanation": "Explanation text",
  "featureFlags": ["red flag 1", "red flag 2"],
  "difficulty": "easy"
}
```

### `POST /api/leaderboard/update`
Update leaderboard with current user stats.

### `POST /api/auth/logout`
Logout the current user.

## Scoring System

- **Base Points**: +1 point for each correct guess
- **Streak Bonus**: +1 bonus point every 5 correct guesses in a row
- **Streak Reset**: Streak resets to 0 on incorrect guess

## Database Schema

The project uses the following Supabase tables:

- **profiles** - User profiles with points and streaks
- **emails** - Email pool for the game
- **guesses** - Individual guess records
- **leaderboard** - Aggregated leaderboard stats
- **game_sessions** - Game session tracking (legacy)

See `ARCHITECTURE.md` for detailed database schema and API contracts.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed:emails` - Seed emails into database

### Environment Variables

**`.env.local`** (required):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**`.env.seed`** (optional, for seeding):
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import repository in [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

The app will automatically build and deploy on every push to main.

## Troubleshooting

**"Invalid API key" error:**
- Verify `.env.local` has correct values
- Restart dev server after changing env vars
- Ensure you're using the anon key, not service role key

**Database permission errors:**
- Use Supabase Table Editor to create tables (see `TABLE-SETUP.md`)
- Then run SQL scripts for RLS policies and triggers

**Emails not showing:**
- Ensure emails table is created and seeded
- Run `npm run seed:emails` to populate emails
- Check Supabase Table Editor to verify emails exist

**Build errors:**
- Clear `.next` directory: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## Contributing

This is a hackathon project. Feel free to fork and improve!

## License

MIT
