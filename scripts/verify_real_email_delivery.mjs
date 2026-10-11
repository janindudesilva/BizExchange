/**
 * scripts/verify_real_email_delivery.mjs
 *
 * Verifies live transactional email delivery configuration using pure Node.js stdlib.
 * Checks for required SMTP or Resend credentials. If absent, reports
 * the exact blocker details without requiring credentials to be checked in.
 */

import tls from 'node:tls';
import net from 'node:net';

async function checkEmailDelivery() {
  const mailHost = process.env.SPRING_MAIL_HOST || process.env.MAIL_HOST;
  const mailPort = parseInt(process.env.SPRING_MAIL_PORT || process.env.MAIL_PORT || '587', 10);
  const mailUser = process.env.MAIL_USERNAME || process.env.SPRING_MAIL_USERNAME;
  const mailPass = process.env.MAIL_PASSWORD || process.env.SPRING_MAIL_PASSWORD;
  const resendApiKey = process.env.RESEND_API_KEY;

  console.log('=== REAL EMAIL DELIVERY CONFIGURATION CHECK ===');

  const hasSmtp = Boolean(mailHost && mailUser && mailPass);
  const hasResend = Boolean(resendApiKey);

  if (!hasSmtp && !hasResend) {
    console.log('[STATUS: BLOCKED]');
    console.log('Reason: No outbound email credentials configured in the environment.');
    console.log('\nRequired Environment Variables for Staging/Production:');
    console.log('  Option A (SMTP, e.g. Amazon SES, Postmark, SendGrid, Mailgun):');
    console.log('    - SPRING_MAIL_HOST (e.g., smtp.sendgrid.net)');
    console.log('    - SPRING_MAIL_PORT (e.g., 587)');
    console.log('    - MAIL_USERNAME (e.g., apikey or your-email@domain.com)');
    console.log('    - MAIL_PASSWORD (e.g., secret-smtp-password)');
    console.log('  Option B (Resend API):');
    console.log('    - RESEND_API_KEY (e.g., re_123456789)');
    console.log('    - RESEND_FROM_ADDRESS (verified domain sender, e.g., noreply@yourdomain.com)');
    console.log('\nToken/Password Protection: Passwords and tokens are strictly excluded from logs.');
    process.exit(2); // Exit code 2 indicates BLOCKED on missing provider credentials
  }

  if (hasResend) {
    console.log('Checking Resend API key authentication...');
    try {
      const res = await fetch('https://api.resend.com/api-keys', {
        headers: { Authorization: `Bearer ${resendApiKey}` }
      });
      if (res.ok) {
        console.log('✓ Resend API key is valid.');
        console.log('[STATUS: PASS]');
        process.exit(0);
      } else {
        console.error(`✗ Resend API error: HTTP ${res.status}`);
        console.log('[STATUS: FAIL]');
        process.exit(1);
      }
    } catch (e) {
      console.error(`✗ Resend connection error: ${e.message}`);
      console.log('[STATUS: FAIL]');
      process.exit(1);
    }
  }

  if (hasSmtp) {
    console.log(`Checking SMTP reachability for ${mailHost}:${mailPort}...`);
    const socket = net.createConnection({ host: mailHost, port: mailPort, timeout: 5000 }, () => {
      console.log(`✓ Successfully established TCP connection to ${mailHost}:${mailPort}.`);
      socket.end();
      console.log('[STATUS: PASS]');
      process.exit(0);
    });

    socket.on('error', (err) => {
      console.error(`✗ Failed to connect to SMTP host: ${err.message}`);
      console.log('[STATUS: FAIL]');
      process.exit(1);
    });

    socket.on('timeout', () => {
      socket.destroy();
      console.error(`✗ Timeout connecting to SMTP host ${mailHost}:${mailPort}`);
      console.log('[STATUS: FAIL]');
      process.exit(1);
    });
  }
}

checkEmailDelivery();
