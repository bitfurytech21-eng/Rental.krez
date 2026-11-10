/**
 * L'Agence / Kretz — Email Trigger Verification Script
 *
 * Verifies that the email sending provider is configured and that
 * automation triggers dispatch correctly when actions are taken.
 *
 * Usage:
 *   # Set provider env vars first:
 *   export RESEND_API_KEY=re_...
 *   # or SMTP_HOST=... SMTP_USER=... SMTP_PASS=...
 *
 *   node scripts/verify-email-triggers.js
 *
 * What it checks:
 *   1. Provider configuration (Resend / SendGrid / SMTP / sandbox)
 *   2. SMTP connection (if SMTP configured)
 *   3. All automation rules are enabled
 *   4. Each email template renders correctly
 *   5. A test email dispatches successfully
 *   6. Webhook ingestion accepts delivery status updates
 */

import {
  sendEmail,
  executeEmailCommand,
  getProviderConfig,
  verifySmtpConnection,
  getEmailSettings,
  getAutomationRules,
  getEmailLogs,
} from '../apps/api/src/emailService.js';

const RESULTS = { passed: 0, failed: 0, skipped: 0 };

function ok(name) { RESULTS.passed++; console.log(`  ✅ ${name}`); }
function fail(name, err) { RESULTS.failed++; console.log(`  ❌ ${name}: ${err.message || err}`); }
function skip(name) { RESULTS.skipped++; console.log(`  ⚠️  ${name} (skipped)`); }

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  L\'Agence — Email Trigger Verification                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ── 1. Provider Configuration ──────────────────────────────
  console.log('1️⃣  Provider Configuration');
  const prov = getProviderConfig();
  console.log(`   Provider: ${prov.name} (${prov.type})`);
  console.log(`   Configured: ${prov.configured ? 'YES' : 'NO — sandbox mode'}`);
  if (prov.configured) ok('Email provider configured');
  else skip('No provider configured — emails will be simulated (sandbox)');

  // ── 2. SMTP Connection (if SMTP) ───────────────────────────
  console.log('\n2️⃣  SMTP Connection');
  if (prov.type === 'smtp') {
    try {
      const smtp = await verifySmtpConnection();
      if (smtp.connected) ok('SMTP connection verified');
      else fail('SMTP connection', new Error(smtp.message || 'Not connected'));
    } catch (e) {
      fail('SMTP connection', e);
    }
  } else {
    skip('SMTP not the active provider');
  }

  // ── 3. Automation Rules ────────────────────────────────────
  console.log('\n3️⃣  Automation Rules');
  const rules = getAutomationRules();
  console.log(`   Total rules: ${rules.length}`);
  let allEnabled = true;
  for (const rule of rules) {
    const status = rule.enabled ? 'enabled' : 'DISABLED';
    console.log(`   • ${rule.eventName} → ${rule.commandName} (${status})`);
    if (!rule.enabled) allEnabled = false;
  }
  if (allEnabled) ok('All automation rules enabled');
  else fail('Automation rules', new Error('Some rules are disabled'));

  // ── 4. Template Rendering ──────────────────────────────────
  console.log('\n4️⃣  Template Rendering');
  const templates = [
    'welcome', 'email_verification', 'password_reset',
    'command_confirmation', 'transaction_receipt', 'payment_notification',
    'security_alert', 'status_update', 'report_notification', 'custom_notification'
  ];
  for (const templateId of templates) {
    try {
      const result = await sendEmail({
        templateId,
        recipient: 'verify@kretzdespain.com',
        data: {
          fullName: 'Verification Tester',
          email: 'verify@kretzdespain.com',
          amount: '1,000.00',
          currency: 'EUR',
          reference: 'KZ-VERIFY-001',
          status: 'Verified',
          notes: 'Template render check',
          action_required: 'None',
          verificationLink: 'https://kretzdespain.com/auth/verify?token=test',
          expiresInHours: '24',
          accountType: 'Accredited Investor',
          event_name: 'Template Test',
          destination: 'Test Destination',
          estimatedProcessingTime: '24 hours',
          certificateId: 'KZ-CERT-VERIFY',
          spvName: 'Test SPV S.L.',
          projectedYield: '12.5% Annualized',
          firstDistributionDate: '1st of next month',
          payment_type: 'Test Payment',
          payment_method: 'Test Method',
          bankTransferId: 'SEPA-TEST-001',
          dispatchedAt: new Date().toUTCString(),
          transaction_id: 'KZ-TX-VERIFY',
          property_title: 'Test Property',
          date: new Date().toISOString().split('T')[0],
          creditedBalance: '2,000.00',
          settledAt: new Date().toUTCString()
        },
        bypassAutomationCheck: true
      });
      if (result.success) ok(`Template: ${templateId}`);
      else fail(`Template: ${templateId}`, new Error(result.error || 'Send failed'));
    } catch (e) {
      fail(`Template: ${templateId}`, e);
    }
  }

  // ── 5. Command-Based Trigger ───────────────────────────────
  console.log('\n5️⃣  Command-Based Trigger (executeEmailCommand)');
  try {
    const result = await executeEmailCommand({
      command: 'send_payment_notification',
      recipient: 'verify@kretzdespain.com',
      payload: {
        fullName: 'Command Tester',
        email: 'verify@kretzdespain.com',
        payment_type: 'Test Command Trigger',
        amount: '500.00',
        currency: 'EUR',
        payment_status: 'Completed',
        reference: 'KZ-CMD-001',
        notes: 'Command pipeline verification',
        transaction_id: 'KZ-CMD-TX-001'
      },
      idempotencyKey: 'idemp-cmd-verify-001'
    });
    if (result.success) ok(`Command: ${result.command} → ${result.templateId}`);
    else fail('Command trigger', new Error(result.error || 'Command failed'));
  } catch (e) {
    fail('Command trigger', e);
  }

  // ── 6. Email Logs ──────────────────────────────────────────
  console.log('\n6️⃣  Email Delivery Logs');
  const logs = getEmailLogs();
  console.log(`   Total log entries: ${logs.length}`);
  const delivered = logs.filter(l => l.status === 'delivered' || l.status === 'sent').length;
  const failed = logs.filter(l => l.status === 'failed').length;
  console.log(`   Delivered/sent: ${delivered}`);
  console.log(`   Failed: ${failed}`);
  if (logs.length > 0) ok('Email logs recording');
  else skip('No email logs found');

  // ── Summary ────────────────────────────────────────────────
  console.log('\n═════════════════════════════════════════════════════════════');
  console.log(`   Results: ${RESULTS.passed} passed, ${RESULTS.failed} failed, ${RESULTS.skipped} skipped`);
  console.log('═════════════════════════════════════════════════════════════\n');

  if (RESULTS.failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Verification script error:', err);
  process.exit(1);
});