# PhishGuard Repository Cleanup Analysis

## Executive Summary

This document identifies files that are safe to remove and files that must be kept for the production-ready PhishGuard application.

---

## 🔴 SAFE-TO-REMOVE FILES

### 1. **Duplicate/Old Profile Hooks**
- **`src/lib/useProfile.ts`** ✅ SAFE TO REMOVE
  - **Reason**: Replaced by `src/providers/profile-provider.tsx` (ProfileProvider)
  - **Verification**: No imports found - all components use `useProfileContext` from ProfileProvider
  - **Impact**: None - ProfileProvider is the current implementation

- **`src/lib/hooks/useProfile.ts`** ✅ SAFE TO REMOVE
  - **Reason**: Replaced by `src/providers/profile-provider.tsx` (ProfileProvider)
  - **Verification**: No imports found - grep shows zero references
  - **Impact**: None - ProfileProvider is the current implementation

### 2. **Old Static Email Data**
- **`src/data/emails.ts`** ✅ SAFE TO REMOVE
  - **Reason**: Static email data replaced by database-driven emails
  - **Verification**: No imports found - emails now come from Supabase `emails` table
  - **Impact**: None - Application uses `/api/emails/next` which queries database
  - **Note**: `src/data/emails.seed.json` should be KEPT (used by seed script)

### 3. **Unused Scoring Module**
- **`src/lib/scoring.ts`** ✅ SAFE TO REMOVE
  - **Reason**: Scoring logic moved to SQL RPC function `apply_guess`
  - **Verification**: No imports found - grep shows zero references
  - **Impact**: None - All scoring happens in PostgreSQL function

### 4. **Unused API Endpoints**
- **`src/app/api/leaderboard/update/route.ts`** ✅ SAFE TO REMOVE
  - **Reason**: Not called anywhere in the codebase
  - **Verification**: No references found - leaderboard updates happen via `apply_guess` RPC
  - **Impact**: None - Leaderboard is computed from profiles table

- **`src/app/api/emails/generate/route.ts`** ⚠️ REVIEW NEEDED
  - **Reason**: Duplicate functionality - we have `src/app/api/admin/generate-emails/route.ts`
  - **Verification**: Not called from frontend, but might be used by external tools
  - **Impact**: Low - Admin generator page uses `/api/admin/generate-emails`
  - **Recommendation**: Check if this endpoint is documented/used externally before removal

### 5. **Duplicate Supabase Client**
- **`src/lib/supabase/client.ts`** ⚠️ CONSOLIDATE OR REMOVE
  - **Reason**: Duplicate of `src/lib/supabase.ts` - both export identical `createClient()`
  - **Verification**: Only 2 files use it: `src/app/admin/generator/page.tsx` and `src/app/auth/page.tsx`
  - **Impact**: Low - Can update those 2 files to use `@/lib/supabase` instead
  - **Recommendation**: Update imports in those 2 files, then remove this file

### 6. **Old SQL Migration Files** (Review with caution)
- **`QUICK-FIX.sql`** ✅ SAFE TO REMOVE
  - **Reason**: Temporary fix file - changes should be in `fix-database-schema.sql` or `supabase-setup.sql`
  - **Verification**: One-time migration script
  - **Impact**: None - Already applied to database

- **`add-badges-column.sql`** ✅ SAFE TO REMOVE
  - **Reason**: One-time migration - badges column now in main schema
  - **Verification**: Should be consolidated into `supabase-setup.sql`
  - **Impact**: None - Already applied

- **`fix-points-accumulation.sql`** ✅ SAFE TO REMOVE
  - **Reason**: One-time fix - logic now in `apply_guess` RPC function
  - **Verification**: Historical migration
  - **Impact**: None - Already applied

- **`emails-table-setup.sql`** ⚠️ REVIEW
  - **Reason**: Might be duplicate of `supabase-setup.sql`
  - **Verification**: Check if content is already in main setup file
  - **Impact**: Low - Keep if contains unique setup steps

- **`complete-setup.sql`** ⚠️ REVIEW
  - **Reason**: Might be duplicate or superseded by `supabase-setup.sql`
  - **Verification**: Compare with `supabase-setup.sql` to see if redundant
  - **Impact**: Low - Keep if contains unique setup steps

### 7. **Documentation Files** (Optional cleanup)
- **`BEDROCK-FIX.md`** ⚠️ OPTIONAL
  - **Reason**: Historical troubleshooting doc
  - **Impact**: None - Can archive or remove if no longer relevant

- **`VERIFY-BEDROCK-SETUP.md`** ⚠️ OPTIONAL
  - **Reason**: Setup verification doc - might be consolidated into main setup guide
  - **Impact**: Low - Useful for troubleshooting but can be merged

---

## 🟢 DO-NOT-REMOVE FILES

### Core Application Files
- **`src/app/**/*.tsx`** - All page components (play, profile, leaderboard, auth, etc.)
- **`src/components/**/*.tsx`** - All UI components (Navbar, EmailViewer, VerdictModal, etc.)
- **`src/providers/profile-provider.tsx`** - Current profile state management
- **`src/middleware.ts`** - Route protection middleware

### Active API Routes
- **`src/app/api/guess/route.ts`** - Game guess handler
- **`src/app/api/emails/next/route.ts`** - Email fetching for gameplay
- **`src/app/api/emails/auto-generate/route.ts`** - Auto-generation endpoint
- **`src/app/api/admin/generate-emails/route.ts`** - Admin email generation
- **`src/app/api/emails/stats/route.ts`** - Email statistics (used by admin page)
- **`src/app/api/profile/get/route.ts`** - Profile retrieval
- **`src/app/api/profile/update/route.ts`** - Profile updates
- **`src/app/api/auth/init/route.ts`** - User initialization
- **`src/app/api/auth/logout/route.ts`** - Logout handler
- **`src/app/api/leaderboard/route.ts`** - Leaderboard data
- **`src/app/api/ml/classify/route.ts`** - ML classification

### Core Libraries
- **`src/lib/supabase.ts`** - Main Supabase client (used by most files)
- **`src/lib/supabase/server.ts`** - Server-side Supabase client
- **`src/lib/badges.ts`** - Badge definitions and logic
- **`src/lib/heuristics.ts`** - Email analysis heuristics
- **`src/lib/llm/bedrock.ts`** - AWS Bedrock integration
- **`src/lib/email-generator.ts`** - Email generation wrapper (used by admin endpoint)
- **`src/lib/generationSchema.ts`** - Email generation schema validation
- **`src/lib/admin.ts`** - Admin access control
- **`src/lib/ml/**`** - ML classification modules
- **`src/lib/utils.ts`** - Utility functions

### Database & Setup
- **`supabase-setup.sql`** - Main database schema
- **`migration-apply-guess.sql`** - Active RPC function for game logic
- **`fix-database-schema.sql`** - Schema fixes (may still be needed)
- **`src/data/emails.seed.json`** - Seed data for initial emails (used by seed script)

### Scripts
- **`scripts/seed-emails.ts`** - Email seeding script (used by `npm run seed:emails`)
- **`scripts/test-bedrock.ts`** - Bedrock testing script (used by `npm run test:bedrock`)

### Configuration
- **`package.json`** - Dependencies and scripts
- **`tsconfig.json`** - TypeScript configuration
- **`next.config.ts`** - Next.js configuration
- **`eslint.config.mjs`** - ESLint configuration
- **`postcss.config.mjs`** - PostCSS configuration
- **`components.json`** - UI component configuration

### Documentation (Keep for deployment)
- **`README.md`** - Main documentation
- **`DEPLOYMENT-CHECKLIST.md`** - Deployment guide
- **`QUICK-DEPLOY.md`** - Quick deployment guide
- **`SETUP-CHECKLIST.md`** - Setup instructions
- **`TABLE-SETUP.md`** - Database setup guide
- **`BEDROCK-SETUP-GUIDE.md`** - Bedrock configuration
- **`ARCHITECTURE.md`** - System architecture

### Types
- **`src/types/database.ts`** - Database type definitions
- **`src/types/game.ts`** - Game type definitions

---

## 📊 Summary Statistics

### Files Safe to Remove: **~10-12 files**
- 2 duplicate profile hooks
- 1 old static email data file
- 1 unused scoring module
- 1-2 unused API endpoints
- 1 duplicate Supabase client (after import updates)
- 3-5 old SQL migration files

### Files to Keep: **~80+ files**
- All active application code
- All active API routes
- Core libraries and utilities
- Database setup files
- Configuration files
- Documentation

---

## ⚠️ IMPORTANT NOTES

1. **Before Removing**: 
   - Run `npm run typecheck` to ensure no type errors
   - Run `npm run build` to ensure build succeeds
   - Test the application in dev mode

2. **SQL Files**: 
   - Some SQL files might be needed for fresh database setups
   - Review `complete-setup.sql` and `emails-table-setup.sql` to see if they contain unique steps not in `supabase-setup.sql`

3. **Import Updates Required**:
   - Update `src/app/admin/generator/page.tsx` to use `@/lib/supabase` instead of `@/lib/supabase/client`
   - Update `src/app/auth/page.tsx` to use `@/lib/supabase` instead of `@/lib/supabase/client`

4. **Testing After Cleanup**:
   - Verify profile state management works
   - Verify email fetching works
   - Verify game scoring works
   - Verify leaderboard displays correctly
   - Verify admin email generation works

---

## 🎯 Recommended Cleanup Order

1. **Phase 1 - Low Risk**:
   - Remove `src/lib/useProfile.ts`
   - Remove `src/lib/hooks/useProfile.ts`
   - Remove `src/data/emails.ts`
   - Remove `src/lib/scoring.ts`

2. **Phase 2 - Medium Risk** (after import updates):
   - Update imports in admin and auth pages
   - Remove `src/lib/supabase/client.ts`
   - Remove `src/app/api/leaderboard/update/route.ts`

3. **Phase 3 - Review Required**:
   - Review and potentially remove `src/app/api/emails/generate/route.ts`
   - Review SQL migration files and consolidate if possible

---

**Status**: Ready for review. Awaiting confirmation before proceeding with deletions.

