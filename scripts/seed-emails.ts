/**
 * Seed script for PhishGuard emails
 * 
 * This script reads emails.seed.json and upserts them into the public.emails table.
 * 
 * Usage:
 *   - With tsx: npx tsx scripts/seed-emails.ts
 *   - With npm: npm run seed:emails
 * 
 * Environment variables required:
 *   - NEXT_PUBLIC_SUPABASE_URL (from .env.local)
 *   - SUPABASE_SERVICE_ROLE_KEY (from .env.seed - get from Supabase Dashboard > Settings > API > service_role key)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local and .env.seed
config({ path: path.join(process.cwd(), '.env.local') });
config({ path: path.join(process.cwd(), '.env.seed') });

interface EmailSeed {
  subject: string;
  from_name: string;
  from_email: string;
  body_html: string;
  is_phish: boolean;
  features: string[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

async function seedEmails() {
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required');
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is required.\n' +
      'Get it from: Supabase Dashboard > Settings > API > service_role key'
    );
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Read seed file
  const seedPath = path.join(process.cwd(), 'src/data/emails.seed.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8')) as EmailSeed[];

  console.log(`📧 Found ${seedData.length} emails to seed...\n`);

  // Upsert emails
  let successCount = 0;
  let errorCount = 0;

  for (const email of seedData) {
    try {
      // Upsert using from_email + subject as unique identifier
      // If email already exists, it will be updated
      const { data, error } = await supabase
        .from('emails')
        .upsert(
          {
            subject: email.subject,
            from_name: email.from_name,
            from_email: email.from_email,
            body_html: email.body_html,
            is_phish: email.is_phish,
            features: email.features,
            explanation: email.explanation,
            difficulty: email.difficulty,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'from_email,subject',
          }
        )
        .select();

      if (error) {
        console.error(`❌ Error seeding "${email.subject}":`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Seeded: "${email.subject}" (${email.is_phish ? 'PHISHING' : 'LEGITIMATE'})`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Unexpected error for "${email.subject}":`, err);
      errorCount++;
    }
  }

  console.log(`\n✨ Seeding complete!`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📊 Total: ${seedData.length}`);
}

// Run the seed function
seedEmails()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });

