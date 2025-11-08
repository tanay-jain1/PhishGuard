import { Email } from '@/types/game';

export const emails: Email[] = [
  {
    id: '1',
    subject: 'Urgent: Verify Your Account Immediately',
    from: 'security@amazon-verify.com',
    to: 'you@example.com',
    body: `Dear Customer,

We have detected unusual activity on your account. To prevent your account from being suspended, please verify your information immediately by clicking the link below:

https://amazon-verify-account.suspicious-site.com/verify

This is URGENT. Your account will be locked within 24 hours if you do not respond.

Best regards,
Amazon Security Team`,
    isPhishing: true,
    explanation: 'This is a phishing email. Legitimate companies never ask you to verify your account via email links, especially with urgent language and threats of account suspension.',
    redFlags: [
      'Urgent/threatening language',
      'Suspicious sender domain (amazon-verify.com instead of amazon.com)',
      'Request to click a link to verify account',
      'Threat of account suspension',
      'Generic greeting ("Dear Customer")'
    ]
  },
  {
    id: '2',
    subject: 'Your Order #12345 Has Shipped',
    from: 'noreply@amazon.com',
    to: 'you@example.com',
    body: `Hello,

Your recent order has shipped and is on its way!

Order #12345
Estimated delivery: Tomorrow by 8pm

You can track your package here: https://www.amazon.com/your-orders

Thank you for shopping with Amazon!`,
    isPhishing: false,
    explanation: 'This is a legitimate email. It comes from the official Amazon domain, provides specific order information, and links to the official Amazon website.',
    redFlags: []
  },
  {
    id: '3',
    subject: 'You\'ve Won $10,000! Claim Your Prize Now!',
    from: 'winner@lottery-prize.com',
    to: 'you@example.com',
    body: `Congratulations!

You have been selected as a winner in our annual lottery! You have won $10,000!

To claim your prize, please send us the following information:
- Full name
- Date of birth
- Social Security Number
- Bank account details

Reply to this email immediately to claim your prize!

Best regards,
Lottery Prize Team`,
    isPhishing: true,
    explanation: 'This is a phishing email. Legitimate lotteries don\'t notify winners via unsolicited emails, and they never ask for sensitive information like SSN or bank details via email.',
    redFlags: [
      'Unsolicited prize notification',
      'Request for sensitive personal information (SSN, bank details)',
      'Urgent language ("immediately")',
      'Suspicious sender domain',
      'Too good to be true'
    ]
  },
  {
    id: '4',
    subject: 'Password Reset Request',
    from: 'noreply@github.com',
    to: 'you@example.com',
    body: `Hi there,

We received a request to reset your password. If you made this request, click the link below:

https://github.com/password_reset?token=abc123xyz

If you didn't request this, you can safely ignore this email. Your password won't be changed.

This link will expire in 1 hour.

Thanks,
The GitHub Team`,
    isPhishing: false,
    explanation: 'This is a legitimate password reset email. It comes from the official GitHub domain, provides clear instructions, and includes a security note about ignoring if you didn\'t request it.',
    redFlags: []
  },
  {
    id: '5',
    subject: 'Re: Your Invoice Payment Overdue',
    from: 'billing@microsoft-support.net',
    to: 'you@example.com',
    body: `Dear Valued Customer,

Your invoice payment is overdue. Please pay immediately to avoid service interruption.

Amount Due: $299.99
Due Date: Yesterday

Click here to pay: http://microsoft-billing-pay.com/invoice

If you have questions, reply to this email.

Microsoft Billing Department`,
    isPhishing: true,
    explanation: 'This is a phishing email. The sender domain (microsoft-support.net) is not Microsoft\'s official domain (microsoft.com), and legitimate companies don\'t use urgent payment threats via email.',
    redFlags: [
      'Suspicious sender domain (microsoft-support.net)',
      'Urgent payment threat',
      'HTTP instead of HTTPS link',
      'Generic greeting',
      'Threat of service interruption'
    ]
  },
  {
    id: '6',
    subject: 'Your Netflix Subscription Renewal',
    from: 'info@account.netflix.com',
    to: 'you@example.com',
    body: `Hi,

Your Netflix subscription will renew automatically on March 15, 2025.

Plan: Standard Plan
Amount: $15.49/month

No action needed. Your payment method on file will be charged automatically.

To update your payment method or cancel, visit: https://www.netflix.com/YourAccount

Thanks for being a member!
Netflix`,
    isPhishing: false,
    explanation: 'This is a legitimate email. It comes from Netflix\'s official domain structure, provides clear subscription information, and links to the official Netflix website.',
    redFlags: []
  }
];

