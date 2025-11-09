# PhishGuard

A web game that teaches users to spot phishing emails and protect themselves online. Players analyze emails and guess whether they're legitimate or phishing attempts, earning points and building streaks while learning about cybersecurity.

## 🌐 Live Application

**🌍 Production URL:** [https://phish-guard-smoky.vercel.app/](https://phish-guard-smoky.vercel.app/)

**📖 About Page:** [https://phish-guard-smoky.vercel.app/about](https://phish-guard-smoky.vercel.app/about)

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
   - Follow the instructions in `TABLE-SETUP.md` to create tables via Supabase Table Editor
   - Run `supabase-setup.sql` in Supabase SQL Editor to create tables and RLS policies
   - Run `migration-apply-guess.sql` to create the `apply_guess` function
   - Run `add-badges-column.sql` to ensure badges column exists
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

For detailed database schema and API contracts, see `ARCHITECTURE.md`.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed:emails` - Seed emails into database

### Environment Variables

#### Required Variables

**`.env.local`** (required for local development):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Where to find:**
- Supabase Dashboard → Settings → API
- `NEXT_PUBLIC_SUPABASE_URL`: Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon/public key

#### Optional Variables

**`.env.local`** (for ML features):
```env
USE_BEDROCK=1
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

**`.env.seed`** (for email seeding):
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**`.env.local`** (for admin features):
```env
ADMIN_EMAILS=admin@example.com,another-admin@example.com
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Deployment

### Vercel (Recommended)

#### Option A: Vercel Dashboard (Easiest)

1. **Push code to GitHub**
   ```bash
   git add -A
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in with GitHub
   - Click "Add New Project"
   - Select your `phishguard` repository
   - Click "Import"

3. **Configure Project**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - All other settings can remain default

4. **Add Environment Variables**
   - Click "Environment Variables" before deploying
   - Add each variable for **Production**, **Preview**, and **Development**:

   **Required:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   **Optional (ML Features):**
   ```
   USE_BEDROCK=1
   AWS_REGION=us-east-1
   BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   ```

   **Optional (Admin/Seeding):**
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ADMIN_EMAILS=admin@example.com
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-5 minutes for build
   - Your app will be live at `phishguard.vercel.app` (or your custom domain)

#### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (from project root)
vercel

# Follow prompts, then add environment variables:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# ... (add each variable)

# Deploy to production
vercel --prod
```

### Post-Deployment Checklist

- [ ] Production build succeeds
- [ ] Production URL works
- [ ] Authentication works (sign up/login)
- [ ] Game flow works end-to-end
- [ ] ML assist appears (if enabled)
- [ ] Leaderboard updates correctly
- [ ] Profile shows stats
- [ ] Mobile responsive
- [ ] No console errors

### Supabase Redirect URL Configuration

After deployment, configure Supabase to allow your Vercel URL:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your Vercel URL to "Redirect URLs":
   ```
   https://phish-guard-smoky.vercel.app
   https://phish-guard-smoky.vercel.app/auth/callback
   ```

The app will automatically build and deploy on every push to `main`.

## Troubleshooting

**"Invalid API key" error:**
- Verify `.env.local` has correct values
- Restart dev server after changing env vars
- Ensure you're using the anon key, not service role key

**Database permission errors:**
- Use Supabase Table Editor to create tables (see `TABLE-SETUP.md`)
- Run `supabase-setup.sql` for RLS policies and triggers
- Ensure `apply_guess` function exists (from `migration-apply-guess.sql`)

**Emails not showing:**
- Ensure emails table is created and seeded
- Run `npm run seed:emails` to populate emails
- Check Supabase Table Editor to verify emails exist

**Build errors:**
- Clear `.next` directory: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## ML Integration (Amazon Bedrock)

PhishGuard supports optional ML-powered email classification using Amazon Bedrock. When enabled, the verdict modal displays ML-assisted analysis alongside heuristic results.

### Required Environment Variables

To enable Bedrock integration, set the following environment variables:

```env
USE_BEDROCK=1
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

**Supported Models:**
- `anthropic.claude-3-haiku-20240307-v1:0` (Claude 3 Haiku)
- `anthropic.claude-3-sonnet-20240229-v1:0` (Claude 3 Sonnet)
- `amazon.titan-text-lite-v1` (Titan Text Lite)
- Other Bedrock-compatible models

### Security Notes

⚠️ **Never commit AWS credentials to version control**

- Use Vercel project environment variables for production
- Consider using a proxy backend to keep credentials server-side
- Content is automatically truncated to ~4000 characters before sending to ML to avoid sending PII
- Review your AWS IAM policies to ensure least-privilege access

### Testing Locally

To test ML integration locally:

```bash
USE_BEDROCK=1 AWS_REGION=us-east-1 BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0 AWS_ACCESS_KEY_ID=your_key AWS_SECRET_ACCESS_KEY=your_secret npm run dev
```

Or add these variables to your `.env.local` file:

```env
USE_BEDROCK=1
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### Troubleshooting

**Permission errors (IAM):**
- Ensure your AWS credentials have `bedrock:InvokeModel` permission
- Check IAM policies allow access to the specified model ID
- Verify the AWS region matches your Bedrock model availability

**Model not found:**
- Verify `BEDROCK_MODEL_ID` matches an available model in your region
- Check model availability in [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
- Some models require access request approval before use

**Rate limits:**
- Bedrock has per-model rate limits (tokens per minute)
- If you hit limits, consider using a different model or implementing retry logic
- Check CloudWatch metrics for detailed rate limit information

**ML section not appearing:**
- Verify `USE_BEDROCK=1` is set
- Check browser console for ML classification errors
- Ensure all required AWS environment variables are present
- ML failures are non-blocking; verdict will still display without ML data

## Admin Email Generator

PhishGuard includes an admin-only email generator that uses AWS Bedrock (Claude 3.5 Haiku) to create realistic email samples for the game. This allows the email pool to grow over time with diverse, high-quality examples.

### Features

- **AI-Powered Generation**: Uses Claude 3.5 Haiku via AWS Bedrock to generate realistic emails
- **Automatic Fallback**: Falls back to a mock generator if Bedrock is not configured
- **Smart Deduplication**: Automatically skips emails that already exist in the database
- **On-the-Fly Computation**: Missing features/difficulty are computed using heuristics when emails are served
- **Accumulating Pool**: Emails accumulate over time, expanding the game's content library

### Access

The admin generator is available at `/admin/generator` and requires:

1. **Authentication**: User must be logged in
2. **Authorization**: User email must be in `ADMIN_EMAILS` environment variable (comma-separated) OR user ID must be in the hardcoded admin list

### Setup

1. **Set Admin Emails** in `.env.local`:
   ```env
   ADMIN_EMAILS=admin@example.com,another-admin@example.com
   ```

2. **Optional: Configure Bedrock** (see ML Integration section above):
   ```env
   AWS_REGION=us-east-1
   BEDROCK_MODEL_ID=anthropic.claude-3-5-haiku-20241022-v1:0
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   ```

3. **Service Role Key** (required for database writes):
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

### Usage

1. Navigate to `/admin/generator` (must be logged in as admin)
2. View current email statistics (total, by difficulty, phishing vs legitimate)
3. Enter number of emails to generate (1-20)
4. Click "Generate Emails"
5. View results (inserted vs skipped duplicates)
6. Statistics automatically refresh after generation

### How It Works

1. **Generation**: Uses Bedrock to generate diverse email samples (HR notices, deliveries, bank alerts, etc.)
2. **Validation**: Each email is validated against a strict Zod schema
3. **Normalization**: Emails are sanitized (removes scripts, external images) and scored
4. **Deduplication**: Checks existing emails by `subject + from_email` to avoid duplicates
5. **Storage**: New emails are inserted into `public.emails` table
6. **Gameplay**: When players request emails, missing features/difficulty are computed on-the-fly using heuristics

### Email Pool Management

- **Initial Setup**: Use `npm run seed:emails` to seed initial emails from `src/data/emails.seed.json`
- **Growth**: Admin generator adds new emails over time
- **Exhaustion**: When a user has seen all emails, the API returns `{ done: true }`
- **Features**: If an email lacks features/difficulty, they're computed automatically when served

### Notes

- Emails accumulate over time - the pool grows as admins generate new content
- The generator creates diverse email types (HR, delivery, bank, school, newsletters, calendar invites)
- Difficulty levels are automatically assigned (1=Easy, 2=Medium, 3=Hard) based on red flags
- If Bedrock is unavailable, the generator falls back to a mock generator for development

## Contributing

This is a hackathon project. Feel free to fork and improve!

## License

MIT
