/**
 * AWS Bedrock LLM Email Generator
 * 
 * Server-only module for generating email samples using Claude 3.5 Haiku.
 * This module should only be imported by API routes (server-side).
 * 
 * WARNING: This module uses server-only environment variables and AWS SDK.
 * Do not import this module in client-side code.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { z } from 'zod';

/**
 * GeneratedEmail schema for validation
 */
const GeneratedEmailSchema = z.object({
  subject: z.string().min(1),
  from_name: z.string().min(1),
  from_email: z.string().email(),
  body_html: z.string().min(1),
  is_phish: z.boolean(),
  explanation: z.string().min(1),
  features: z.array(z.string()).optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

const GeneratedEmailArraySchema = z.array(GeneratedEmailSchema).min(1).max(20);

export type GeneratedEmail = z.infer<typeof GeneratedEmailSchema>;

/**
 * Check if Bedrock is configured with required environment variables
 */
export function hasBedrock(): boolean {
  return !!(
    process.env.AWS_REGION &&
    (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE)
  );
}

/**
 * Generate emails using AWS Bedrock (Claude 3.5 Haiku)
 */
export async function bedrockGenerateEmails(count: number): Promise<GeneratedEmail[]> {
  const region = process.env.AWS_REGION;
  const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-haiku-20241022-v1:0';

  if (!region) {
    throw new Error('AWS_REGION environment variable is required');
  }

  // Create Bedrock client
  // Credentials are optional if using IAM role (e.g., on EC2, Lambda, ECS)
  const clientConfig: {
    region: string;
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
    };
  } = {
    region,
  };

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  const client = new BedrockRuntimeClient(clientConfig);

  // Build system and user prompts
  const systemPrompt = `You are generating realistic examples of emails for a phishing-detection learning game. Produce safe, compact HTML emails. Never include tracking pixels, external scripts, or real credentials. Output strict JSON only.`;

  const userPrompt = `Generate ${count} realistic emails (both legitimate and phishing). For each:

- subject (string, <=120 chars)
- from_name (string)
- from_email (string, looks plausible)
- body_html (compact HTML only: <p>, <a>, <ul>, <b>, <i>)
- is_phish (boolean)
- explanation (1–2 sentences why it's phishing or why legit)
- features (optional string[] flags, choose from: public_domain_sender, domain_misspelling, sender_not_matching_brand, spelling_grammar_issues, urgent_language, tone_mismatch, anchor_mismatch, shortened_link, http_not_https, unexpected_attachment, asks_for_credentials, asks_for_payment, threatens_negative_consequences)
- difficulty (optional 1|2|3; base on number/severity of features)

Return as a JSON array only. No prose.`;

  // Prepare request body for Claude 3.5 Haiku
  const body = new TextEncoder().encode(
    JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })
  );

  const command = new InvokeModelCommand({
    modelId,
    body,
    contentType: 'application/json',
    accept: 'application/json',
  });

  try {
    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract text from Claude's response
    const text =
      responseBody.content?.[0]?.text ||
      responseBody.completion ||
      JSON.stringify(responseBody);

    // Try to parse JSON from the response
    let jsonText = text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      const lines = jsonText.split('\n');
      lines.shift(); // Remove first line (```json or ```)
      if (lines[lines.length - 1].trim() === '```') {
        lines.pop(); // Remove last line (```)
      }
      jsonText = lines.join('\n');
    }

    // Try to find JSON array in the text
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    const validationResult = GeneratedEmailArraySchema.safeParse(parsed);

    if (!validationResult.success) {
      throw new Error(
        `Validation failed: ${validationResult.error.issues.map((e) => `${e.message}`).join(', ')}`
      );
    }

    return validationResult.data;
  } catch (error) {
    console.error('Bedrock generation error:', error);
    throw error;
  }
}

/**
 * Comprehensive email templates for diverse, realistic email generation
 */
interface EmailTemplate {
  category: string;
  legitimate?: {
    subject: string;
    from_name: string;
    from_email: string;
    body_html: string;
    is_phish: false;
    explanation: string;
    difficulty: 1 | 2 | 3;
    features?: string[];
  };
  phishing?: {
    subject: string;
    from_name: string;
    from_email: string;
    body_html: string;
    is_phish: true;
    explanation: string;
    difficulty: 1 | 2 | 3;
    features: string[];
  };
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  // E-commerce & Shopping
  {
    category: 'E-commerce Order',
    legitimate: {
      subject: 'Your Order #ORD-2847 Has Shipped',
      from_name: 'Amazon',
      from_email: 'noreply@amazon.com',
      body_html: '<p>Hello,</p><p>Your recent order has been shipped and is on its way to you!</p><p><strong>Order #ORD-2847</strong><br>Estimated delivery: Friday, December 15</p><p>Track your package: <a href="https://www.amazon.com/your-orders">View Order Details</a></p><p>Thank you for shopping with Amazon!</p>',
      is_phish: false,
      explanation: 'Legitimate order confirmation from official Amazon domain with specific order details and secure HTTPS link.',
      difficulty: 1,
    },
    phishing: {
      subject: 'URGENT: Verify Your Amazon Account',
      from_name: 'Amazon Security',
      from_email: 'security@amazon-verify.com',
      body_html: '<p>Dear Customer,</p><p>We have detected suspicious activity on your account. To prevent suspension, verify your information immediately:</p><p><a href="http://amazon-verify-account.com/login">Verify Account</a></p><p><strong>Your account will be locked within 24 hours if you do not respond.</strong></p>',
      is_phish: true,
      explanation: 'Phishing email with suspicious domain, urgent/threatening language, and HTTP link. Legitimate companies never threaten account suspension via email.',
      difficulty: 2,
      features: ['Domain misspelling', 'Urgent language', 'HTTP not HTTPS', 'Threatens negative consequences'],
    },
  },
  {
    category: 'Package Delivery',
    legitimate: {
      subject: 'Your Package Has Been Delivered',
      from_name: 'FedEx',
      from_email: 'noreply@fedex.com',
      body_html: '<p>Your package was delivered today at 2:30 PM.</p><p>Tracking Number: 1234567890</p><p><a href="https://www.fedex.com/tracking">View Delivery Details</a></p>',
      is_phish: false,
      explanation: 'Legitimate delivery notification from official FedEx domain with tracking number and secure link.',
      difficulty: 1,
    },
    phishing: {
      subject: 'Package Delivery Failed - Update Required',
      from_name: 'FedEx Delivery',
      from_email: 'delivery@fedex-update.net',
      body_html: '<p>Your package delivery failed due to an incorrect address.</p><p>Update your address immediately: <a href="https://bit.ly/fedex-update-123">Update Address</a></p><p>You must respond within 2 hours or your package will be returned to sender.</p>',
      is_phish: true,
      explanation: 'Phishing email with suspicious domain, shortened URL, and urgent deadline. Official delivery services use their own domains, not shortened links.',
      difficulty: 2,
      features: ['Suspicious domain', 'Shortened link', 'Urgent language'],
    },
  },
  {
    category: 'Payment & Billing',
    legitimate: {
      subject: 'Payment Receipt - Invoice #INV-7892',
      from_name: 'Stripe',
      from_email: 'receipts@stripe.com',
      body_html: '<p>Thank you for your payment!</p><p><strong>Invoice #INV-7892</strong><br>Amount: $49.99<br>Date: December 10, 2024</p><p><a href="https://dashboard.stripe.com/invoices">View Receipt</a></p>',
      is_phish: false,
      explanation: 'Legitimate payment receipt from official Stripe domain with invoice details and secure dashboard link.',
      difficulty: 1,
    },
    phishing: {
      subject: 'Payment Failed - Update Your Card',
      from_name: 'PayPal Billing',
      from_email: 'billing@paypal-secure.net',
      body_html: '<p>Your recent payment could not be processed.</p><p>Update your payment method immediately: <a href="http://paypal-secure.net/update">Update Card</a></p><p>Your account may be suspended if payment is not updated within 48 hours.</p>',
      is_phish: true,
      explanation: 'Phishing email with suspicious domain (PayPal uses paypal.com, not paypal-secure.net), HTTP link, and threatening language.',
      difficulty: 2,
      features: ['Domain misspelling', 'HTTP not HTTPS', 'Urgent language', 'Threatens negative consequences'],
    },
  },
  
  // Banking & Financial
  {
    category: 'Bank Statement',
    legitimate: {
      subject: 'Your Monthly Statement is Available',
      from_name: 'Chase Bank',
      from_email: 'noreply@chase.com',
      body_html: '<p>Your monthly statement is now available in Online Banking.</p><p><a href="https://www.chase.com">Sign In to View Statement</a></p><p>This is an automated message. Please do not reply.</p>',
      is_phish: false,
      explanation: 'Legitimate bank notification from official Chase domain with secure login link and standard disclaimer.',
      difficulty: 1,
    },
    phishing: {
      subject: 'Account Suspension Notice - Action Required',
      from_name: 'Chase Security',
      from_email: 'security@chase-bank-secure.com',
      body_html: '<p>Your account has been flagged for suspicious activity and temporarily frozen.</p><p>Verify your identity to restore access: <a href="http://chase-bank-secure.com/verify">Verify Account</a></p><p>Please provide your account number, SSN, and online banking password.</p>',
      is_phish: true,
      explanation: 'Phishing email requesting sensitive information (SSN, password) via email. Banks never ask for this information via email. Suspicious domain and HTTP link.',
      difficulty: 3,
      features: ['Suspicious domain', 'Asks for credentials', 'HTTP not HTTPS', 'Urgent language', 'Threatens negative consequences'],
    },
  },
  {
    category: 'Credit Card',
    legitimate: {
      subject: 'New Transaction Alert',
      from_name: 'American Express',
      from_email: 'alerts@americanexpress.com',
      body_html: '<p>New transaction on your card ending in 1234:</p><p><strong>$89.50 at Coffee Shop</strong><br>Date: December 10, 2024</p><p>If this was not you, contact us immediately: <a href="https://www.americanexpress.com/fraud">Report Fraud</a></p>',
      is_phish: false,
      explanation: 'Legitimate transaction alert from official American Express domain with specific transaction details and secure fraud reporting link.',
      difficulty: 1,
    },
    phishing: {
      subject: 'Suspicious Activity Detected - Verify Now',
      from_name: 'Visa Card Services',
      from_email: 'security@visa-card-verify.net',
      body_html: '<p>We detected unusual activity on your Visa card. Verify your account:</p><p><a href="https://tinyurl.com/visa-verify-xyz">Verify Card</a></p><p><strong>URGENT:</strong> Your card will be blocked if you do not verify within 6 hours.</p>',
      is_phish: true,
      explanation: 'Phishing email with suspicious domain, shortened URL, and urgent threatening language. Card companies use official domains and don\'t threaten immediate blocking.',
      difficulty: 2,
      features: ['Suspicious domain', 'Shortened link', 'Urgent language', 'Threatens negative consequences'],
    },
  },
  
  // Social Media & Tech
  {
    category: 'Social Media',
    legitimate: {
      subject: 'New login from San Francisco, CA',
      from_name: 'Facebook',
      from_email: 'security@facebookmail.com',
      body_html: '<p>We noticed a new login to your Facebook account.</p><p><strong>Location:</strong> San Francisco, CA<br><strong>Device:</strong> Chrome on Windows<br><strong>Time:</strong> December 10, 2024 at 3:45 PM</p><p>If this was you, you can ignore this message. If not, <a href="https://www.facebook.com/security">secure your account</a>.</p>',
      is_phish: false,
      explanation: 'Legitimate security alert from official Facebook domain with specific login details and secure account management link.',
      difficulty: 1,
    },
    phishing: {
      subject: 'Your Facebook Account Will Be Deleted',
      from_name: 'Facebook Support',
      from_email: 'support@facebook-help.com',
      body_html: '<p>Your account violates our community standards and will be deleted in 48 hours.</p><p>Appeal this decision: <a href="http://facebook-help.com/appeal">Appeal Now</a></p><p>You must provide your password and date of birth to verify your identity.</p>',
      is_phish: true,
      explanation: 'Phishing email with suspicious domain, HTTP link, and request for password. Facebook never asks for passwords via email and uses official facebook.com domains.',
      difficulty: 2,
      features: ['Suspicious domain', 'HTTP not HTTPS', 'Asks for credentials', 'Threatens negative consequences'],
    },
  },
  {
    category: 'Tech Support',
    legitimate: {
      subject: 'Your Microsoft Account - Security Update',
      from_name: 'Microsoft Account Team',
      from_email: 'account-security-noreply@accountprotection.microsoft.com',
      body_html: '<p>We\'ve updated your account security settings as requested.</p><p>If you did not make this change, <a href="https://account.microsoft.com/security">review your security settings</a>.</p>',
      is_phish: false,
      explanation: 'Legitimate security update from official Microsoft domain (accountprotection.microsoft.com) with secure account management link.',
      difficulty: 2,
    },
    phishing: {
      subject: 'Microsoft Windows - License Expired',
      from_name: 'Microsoft Support',
      from_email: 'support@microsoft-support.net',
      body_html: '<p>Your Windows license has expired. Renew immediately to avoid system shutdown.</p><p>Renew license: <a href="http://microsoft-support.net/renew">Renew Now</a></p><p>Price: $99.99 - Pay with credit card or PayPal.</p>',
      is_phish: true,
      explanation: 'Phishing email with suspicious domain (Microsoft uses microsoft.com, not microsoft-support.net), HTTP link, and request for payment. Microsoft doesn\'t send license expiration emails like this.',
      difficulty: 2,
      features: ['Suspicious domain', 'HTTP not HTTPS', 'Asks for payment', 'Urgent language'],
    },
  },
  {
    category: 'Cloud Storage',
    legitimate: {
      subject: 'You have 3 new shared files',
      from_name: 'Google Drive',
      from_email: 'drive-noreply@google.com',
      body_html: '<p>Sarah Johnson shared 3 files with you.</p><p><a href="https://drive.google.com">View in Google Drive</a></p><p>You can access these files anytime from your Drive.</p>',
      is_phish: false,
      explanation: 'Legitimate file sharing notification from official Google domain with secure Drive link.',
      difficulty: 1,
    },
    phishing: {
      subject: 'Your Google Drive Storage is Full',
      from_name: 'Google Drive',
      from_email: 'drive@google-storage.net',
      body_html: '<p>Your Google Drive storage is 100% full. Upgrade now to continue accessing your files.</p><p>Upgrade: <a href="https://bit.ly/google-drive-upgrade">Upgrade Storage</a></p><p>Your files will be deleted if you do not upgrade within 7 days.</p>',
      is_phish: true,
      explanation: 'Phishing email with suspicious domain (Google uses google.com, not google-storage.net), shortened URL, and threatening language. Google doesn\'t delete files for storage issues without multiple warnings.',
      difficulty: 2,
      features: ['Suspicious domain', 'Shortened link', 'Threatens negative consequences'],
    },
  },
  
  // Email & Communication
  {
    category: 'Email Service',
    legitimate: {
      subject: 'New sign-in to your account',
      from_name: 'Gmail',
      from_email: 'no-reply@accounts.google.com',
      body_html: '<p>New sign-in detected on your Google Account.</p><p><strong>Location:</strong> New York, NY<br><strong>Time:</strong> December 10, 2024 at 10:23 AM</p><p>If this wasn\'t you, <a href="https://myaccount.google.com/security">secure your account</a>.</p>',
      is_phish: false,
      explanation: 'Legitimate security alert from official Google Accounts domain with specific sign-in details and secure account management link.',
      difficulty: 1,
    },
    phishing: {
      subject: 'Your Email Account Will Be Deleted',
      from_name: 'Gmail Support',
      from_email: 'support@gmail-help.com',
      body_html: '<p>Your Gmail account is inactive and will be deleted in 30 days.</p><p>Verify your account to keep it active: <a href="http://gmail-help.com/verify">Verify Account</a></p><p>Provide your password and recovery email to continue.</p>',
      is_phish: true,
      explanation: 'Phishing email with suspicious domain (Gmail uses google.com/gmail.com, not gmail-help.com), HTTP link, and request for password. Google never asks for passwords via email.',
      difficulty: 2,
      features: ['Suspicious domain', 'HTTP not HTTPS', 'Asks for credentials', 'Threatens negative consequences'],
    },
  },
  
  // Work & Professional
  {
    category: 'Workplace',
    legitimate: {
      subject: 'Meeting Reminder: Team Standup',
      from_name: 'Sarah Johnson',
      from_email: 'sarah.johnson@company.com',
      body_html: '<p>Reminder: Team standup meeting is scheduled for today at 10:00 AM.</p><p><strong>Location:</strong> Conference Room B<br><strong>Agenda:</strong> Weekly updates and sprint planning</p><p>See you there!</p>',
      is_phish: false,
      explanation: 'Legitimate meeting reminder from company email domain with specific meeting details.',
      difficulty: 1,
    },
    phishing: {
      subject: 'URGENT: Update Your Employee Portal Password',
      from_name: 'HR Department',
      from_email: 'hr@company-verify.net',
      body_html: '<p>Your employee portal password must be updated immediately due to a security breach.</p><p>Update password: <a href="http://company-verify.net/update-password">Update Now</a></p><p>Your account access will be revoked if you do not update within 24 hours.</p>',
      is_phish: true,
      explanation: 'Phishing email with suspicious domain (company would use company.com, not company-verify.net), HTTP link, and urgent threatening language. Legitimate HR emails use official company domains.',
      difficulty: 2,
      features: ['Suspicious domain', 'HTTP not HTTPS', 'Urgent language', 'Threatens negative consequences'],
    },
  },
  {
    category: 'Job Application',
    legitimate: {
      subject: 'Application Received - Software Engineer Position',
      from_name: 'Tech Corp Recruiting',
      from_email: 'recruiting@techcorp.com',
      body_html: '<p>Thank you for your application for the Software Engineer position.</p><p>We have received your resume and will review it within 5-7 business days.</p><p>You can check your application status at <a href="https://careers.techcorp.com">our careers portal</a>.</p>',
      is_phish: false,
      explanation: 'Legitimate job application confirmation from company domain with professional tone and secure careers portal link.',
      difficulty: 1,
    },
    phishing: {
      subject: 'Congratulations! You\'ve Been Selected',
      from_name: 'HR Manager',
      from_email: 'hr@techcorp-jobs.net',
      body_html: '<p>Congratulations! You have been selected for a remote position paying $5,000/week.</p><p>To proceed, please provide:</p><ul><li>Your full name and address</li><li>Bank account details for direct deposit</li><li>Social Security Number</li></ul><p>Reply to this email with the requested information.</p>',
      is_phish: true,
      explanation: 'Phishing email with too-good-to-be-true offer, suspicious domain, and request for sensitive information (SSN, bank details). Legitimate employers never ask for this information via email.',
      difficulty: 3,
      features: ['Suspicious domain', 'Asks for credentials', 'Too good to be true', 'Spelling/grammar issues'],
    },
  },
  
  // Travel & Hospitality
  {
    category: 'Travel Booking',
    legitimate: {
      subject: 'Your Flight Confirmation - Trip to Paris',
      from_name: 'United Airlines',
      from_email: 'noreply@united.com',
      body_html: '<p>Your flight has been confirmed!</p><p><strong>Flight:</strong> UA 456<br><strong>Departure:</strong> JFK, December 20, 2024 at 8:00 AM<br><strong>Arrival:</strong> CDG, December 20, 2024 at 10:30 PM</p><p><a href="https://www.united.com/checkin">Check In Online</a></p>',
      is_phish: false,
      explanation: 'Legitimate flight confirmation from official United Airlines domain with specific flight details and secure check-in link.',
      difficulty: 1,
    },
    phishing: {
      subject: 'Your Flight Has Been Cancelled - Refund Available',
      from_name: 'Delta Airlines',
      from_email: 'refunds@delta-airlines.net',
      body_html: '<p>Your flight has been cancelled due to weather conditions.</p><p>Click here to request a refund: <a href="http://delta-airlines.net/refund">Request Refund</a></p><p>You must provide your credit card number and CVV to process the refund.</p>',
      is_phish: true,
      explanation: 'Phishing email with suspicious domain (Delta uses delta.com, not delta-airlines.net), HTTP link, and request for credit card details. Airlines never ask for full card details for refunds.',
      difficulty: 3,
      features: ['Suspicious domain', 'HTTP not HTTPS', 'Asks for payment information', 'Urgent language'],
    },
  },
  {
    category: 'Hotel Reservation',
    legitimate: {
      subject: 'Your Reservation Confirmation - Holiday Inn',
      from_name: 'Holiday Inn',
      from_email: 'reservations@holidayinn.com',
      body_html: '<p>Your reservation has been confirmed!</p><p><strong>Check-in:</strong> December 15, 2024 at 3:00 PM<br><strong>Check-out:</strong> December 17, 2024 at 11:00 AM<br><strong>Confirmation #:</strong> HI-789456</p><p><a href="https://www.holidayinn.com/manage-reservation">Manage Reservation</a></p>',
      is_phish: false,
      explanation: 'Legitimate hotel reservation confirmation from official Holiday Inn domain with specific reservation details and secure management link.',
      difficulty: 1,
    },
    phishing: {
      subject: 'Your Hotel Reservation Requires Payment',
      from_name: 'Marriott Hotels',
      from_email: 'billing@marriott-hotels.net',
      body_html: '<p>Your reservation cannot be confirmed until payment is received.</p><p>Pay now: <a href="http://marriott-hotels.net/payment">Complete Payment</a></p><p>Your reservation will be cancelled if payment is not received within 6 hours.</p>',
      is_phish: true,
      explanation: 'Phishing email with suspicious domain (Marriott uses marriott.com, not marriott-hotels.net), HTTP link, and urgent threatening language. Hotels confirm reservations before requesting payment.',
      difficulty: 2,
      features: ['Suspicious domain', 'HTTP not HTTPS', 'Asks for payment', 'Urgent language', 'Threatens negative consequences'],
    },
  },
  
  // Subscription & Services
  {
    category: 'Streaming Service',
    legitimate: {
      subject: 'Your Netflix Subscription Renewal',
      from_name: 'Netflix',
      from_email: 'info@account.netflix.com',
      body_html: '<p>Your Netflix subscription has been renewed.</p><p><strong>Amount:</strong> $15.99<br><strong>Next billing date:</strong> January 10, 2025</p><p><a href="https://www.netflix.com/account">Manage Subscription</a></p>',
      is_phish: false,
      explanation: 'Legitimate subscription renewal notification from official Netflix domain with billing details and secure account management link.',
      difficulty: 1,
    },
    phishing: {
      subject: 'Netflix Account Suspended - Payment Required',
      from_name: 'Netflix Billing',
      from_email: 'billing@netflix-update.com',
      body_html: '<p>Your Netflix account has been suspended due to a payment issue.</p><p>Update your payment method: <a href="http://netflix-update.com/payment">Update Payment</a></p><p>Your account will be permanently deleted if payment is not updated within 48 hours.</p>',
      is_phish: true,
      explanation: 'Phishing email with suspicious domain (Netflix uses netflix.com, not netflix-update.com), HTTP link, and threatening language. Netflix sends payment issues from official netflix.com domain.',
      difficulty: 2,
      features: ['Suspicious domain', 'HTTP not HTTPS', 'Asks for payment', 'Threatens negative consequences'],
    },
  },
  
  // Government & Official
  {
    category: 'Tax & Government',
    legitimate: {
      subject: 'IRS: Your Tax Refund Has Been Processed',
      from_name: 'Internal Revenue Service',
      from_email: 'no-reply@irs.gov',
      body_html: '<p>Your tax refund has been processed.</p><p><strong>Refund Amount:</strong> $1,250.00<br><strong>Expected Deposit Date:</strong> December 20, 2024</p><p>Check your refund status at <a href="https://www.irs.gov/refunds">IRS.gov/refunds</a>.</p>',
      is_phish: false,
      explanation: 'Legitimate IRS notification from official .gov domain with specific refund details and secure government website link.',
      difficulty: 2,
    },
    phishing: {
      subject: 'IRS: Tax Refund Suspended - Verification Required',
      from_name: 'IRS Tax Department',
      from_email: 'tax-refund@irs-gov.net',
      body_html: '<p>Your tax refund has been suspended pending verification.</p><p>Verify your identity: <a href="http://irs-gov.net/verify">Verify Now</a></p><p>Provide your Social Security Number and bank account details to receive your refund.</p>',
      is_phish: true,
      explanation: 'Phishing email with suspicious domain (IRS uses irs.gov, not irs-gov.net), HTTP link, and request for SSN and bank details. The IRS never asks for this information via email.',
      difficulty: 3,
      features: ['Suspicious domain', 'HTTP not HTTPS', 'Asks for credentials', 'Sender not matching brand'],
    },
  },
  
  // Healthcare
  {
    category: 'Healthcare',
    legitimate: {
      subject: 'Appointment Reminder - Dr. Smith',
      from_name: 'City Medical Center',
      from_email: 'noreply@citymedical.com',
      body_html: '<p>Reminder: You have an appointment scheduled.</p><p><strong>Doctor:</strong> Dr. Sarah Smith<br><strong>Date:</strong> December 18, 2024 at 2:00 PM<br><strong>Location:</strong> 123 Main Street, Suite 200</p><p>Please arrive 15 minutes early.</p>',
      is_phish: false,
      explanation: 'Legitimate appointment reminder from medical center with specific appointment details and professional tone.',
      difficulty: 1,
    },
    phishing: {
      subject: 'Your Medical Records Require Update',
      from_name: 'Health Insurance',
      from_email: 'records@health-insurance.net',
      body_html: '<p>Your medical records are incomplete and require immediate update.</p><p>Update records: <a href="http://health-insurance.net/update">Update Now</a></p><p>Provide your insurance ID, date of birth, and Social Security Number to complete your records.</p>',
      is_phish: true,
      explanation: 'Phishing email with suspicious domain, HTTP link, and request for sensitive information (SSN, insurance ID). Healthcare providers use official domains and secure portals.',
      difficulty: 3,
      features: ['Suspicious domain', 'HTTP not HTTPS', 'Asks for credentials', 'Urgent language'],
    },
  },
  
  // Education
  {
    category: 'Education',
    legitimate: {
      subject: 'Course Registration Confirmation',
      from_name: 'University Registrar',
      from_email: 'registrar@university.edu',
      body_html: '<p>Your course registration has been confirmed.</p><p><strong>Course:</strong> Introduction to Computer Science<br><strong>Instructor:</strong> Dr. Johnson<br><strong>Schedule:</strong> MWF 10:00-11:00 AM</p><p>View your schedule at <a href="https://portal.university.edu">Student Portal</a>.</p>',
      is_phish: false,
      explanation: 'Legitimate course registration confirmation from official university domain with specific course details and secure portal link.',
      difficulty: 1,
    },
    phishing: {
      subject: 'Your Student Account Has Been Locked',
      from_name: 'University IT',
      from_email: 'it@university-verify.net',
      body_html: '<p>Your student account has been locked due to suspicious activity.</p><p>Unlock account: <a href="http://university-verify.net/unlock">Unlock Now</a></p><p>Provide your student ID and password to restore access.</p>',
      is_phish: true,
      explanation: 'Phishing email with suspicious domain (universities use .edu domains, not .net), HTTP link, and request for password. University IT departments use official .edu domains.',
      difficulty: 2,
      features: ['Suspicious domain', 'HTTP not HTTPS', 'Asks for credentials', 'Threatens negative consequences'],
    },
  },
  
  // Utilities
  {
    category: 'Utilities',
    legitimate: {
      subject: 'Your Electric Bill is Ready',
      from_name: 'Pacific Gas & Electric',
      from_email: 'noreply@pge.com',
      body_html: '<p>Your monthly electric bill is now available.</p><p><strong>Amount Due:</strong> $125.50<br><strong>Due Date:</strong> December 25, 2024</p><p><a href="https://www.pge.com/paybill">Pay Bill Online</a></p>',
      is_phish: false,
      explanation: 'Legitimate utility bill notification from official PG&E domain with billing details and secure payment link.',
      difficulty: 1,
    },
    phishing: {
      subject: 'URGENT: Your Power Will Be Shut Off',
      from_name: 'Electric Company',
      from_email: 'billing@electric-company.net',
      body_html: '<p>Your account is past due and service will be disconnected within 24 hours.</p><p>Pay now: <a href="http://electric-company.net/pay">Pay Immediately</a></p><p>Provide your credit card number and account number to avoid disconnection.</p>',
      is_phish: true,
      explanation: 'Phishing email with suspicious domain, HTTP link, urgent threatening language, and request for credit card details. Utility companies use official domains and don\'t threaten immediate disconnection via email.',
      difficulty: 2,
      features: ['Suspicious domain', 'HTTP not HTTPS', 'Urgent language', 'Threatens negative consequences', 'Asks for payment information'],
    },
  },
];

/**
 * Smart email selection algorithm that ensures diversity
 */
function selectDiverseEmails(count: number): GeneratedEmail[] {
  const selected: GeneratedEmail[] = [];
  const usedCategories = new Map<string, number>();
  
  // Target distribution: ~60% phishing, ~40% legitimate (more challenging)
  const phishingTarget = Math.ceil(count * 0.6);
  const legitimateTarget = count - phishingTarget;
  
  let phishingCount = 0;
  let legitimateCount = 0;
  
  // Difficulty distribution: 40% easy, 40% medium, 20% hard
  const difficultyTargets = {
    1: Math.ceil(count * 0.4),
    2: Math.ceil(count * 0.4),
    3: Math.ceil(count * 0.2),
  };
  const difficultyCounts = { 1: 0, 2: 0, 3: 0 };
  
  // Shuffle templates for randomness
  const shuffledTemplates = [...EMAIL_TEMPLATES].sort(() => Math.random() - 0.5);
  
  // First pass: select diverse emails
  for (const template of shuffledTemplates) {
    if (selected.length >= count) break;
    
    const categoryCount = usedCategories.get(template.category) || 0;
    if (categoryCount >= 2) continue; // Limit 2 emails per category
    
    // Decide if we need phishing or legitimate
    const needsPhishing = phishingCount < phishingTarget;
    const needsLegitimate = legitimateCount < legitimateTarget;
    
    let emailToAdd: GeneratedEmail | null = null;
    
    if (needsPhishing && template.phishing) {
      // Check if this difficulty is still needed
      if (difficultyCounts[template.phishing.difficulty] < difficultyTargets[template.phishing.difficulty]) {
        emailToAdd = { ...template.phishing };
        phishingCount++;
        difficultyCounts[template.phishing.difficulty]++;
      }
    } else if (needsLegitimate && template.legitimate) {
      // Check if this difficulty is still needed
      if (difficultyCounts[template.legitimate.difficulty] < difficultyTargets[template.legitimate.difficulty]) {
        emailToAdd = { ...template.legitimate };
        legitimateCount++;
        difficultyCounts[template.legitimate.difficulty]++;
      }
    }
    
    if (emailToAdd) {
      // Ensure features is always an array
      if (!emailToAdd.features) {
        emailToAdd.features = [];
      }
      selected.push(emailToAdd);
      usedCategories.set(template.category, categoryCount + 1);
    }
  }
  
  // Second pass: fill remaining slots with any available emails
  while (selected.length < count) {
    for (const template of shuffledTemplates) {
      if (selected.length >= count) break;
      
      const categoryCount = usedCategories.get(template.category) || 0;
      if (categoryCount >= 3) continue; // Hard limit of 3 per category
      
      const needsPhishing = phishingCount < phishingTarget;
      const needsLegitimate = legitimateCount < legitimateTarget;
      
      let emailToAdd: GeneratedEmail | null = null;
      
      if (needsPhishing && template.phishing) {
        emailToAdd = { ...template.phishing };
        phishingCount++;
      } else if (needsLegitimate && template.legitimate) {
        emailToAdd = { ...template.legitimate };
        legitimateCount++;
      } else if (template.phishing) {
        // Use whatever is available if targets are met
        emailToAdd = { ...template.phishing };
        phishingCount++;
      } else if (template.legitimate) {
        emailToAdd = { ...template.legitimate };
        legitimateCount++;
      }
      
      if (emailToAdd) {
        if (!emailToAdd.features) {
          emailToAdd.features = [];
        }
        selected.push(emailToAdd);
        usedCategories.set(template.category, categoryCount + 1);
      }
    }
    
    // Prevent infinite loop
    if (selected.length === 0) break;
  }
  
  // Shuffle the final selection for random order
  return selected.sort(() => Math.random() - 0.5);
}

/**
 * Mock generator for development (when Bedrock is not configured)
 */
export async function bedrockMockGenerateEmails(count: number): Promise<GeneratedEmail[]> {
  const actualCount = Math.min(Math.max(1, Math.floor(count)), 20);
  const emails = selectDiverseEmails(actualCount);
  
  console.log(`✅ Mock generator created ${emails.length} emails`);
  console.log(`📊 Distribution: ${emails.filter(e => e.is_phish).length} phishing, ${emails.filter(e => !e.is_phish).length} legitimate`);
  console.log(`📊 Difficulty: ${emails.filter(e => e.difficulty === 1).length} easy, ${emails.filter(e => e.difficulty === 2).length} medium, ${emails.filter(e => e.difficulty === 3).length} hard`);
  
  return emails;
}

/**
 * Main generator function that chooses bedrock or mock based on configuration
 */
export async function generateEmails(count: number): Promise<GeneratedEmail[]> {
  // Enforce reasonable limits
  const actualCount = Math.min(Math.max(1, Math.floor(count)), 20);

  if (hasBedrock()) {
    try {
      return await bedrockGenerateEmails(actualCount);
    } catch (error) {
      console.warn('Bedrock generation failed, falling back to mock:', error);
      return await bedrockMockGenerateEmails(actualCount);
    }
  }

  return await bedrockMockGenerateEmails(actualCount);
}
