# Magic Link Email Customization Guide

## Current Issue
The default Supabase magic link email doesn't clearly indicate it's from GigLedger. Users see:
- Subject: "Your Magic Link"
- From: "Supabase Auth <noreply@mail.app.supabase.io>"
- Body: Generic "Follow this link to login" with Supabase branding

## Solution: Customize Email Template in Supabase Dashboard

### Step 1: Access Email Templates
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/jvostkeswhfwntbrfzl/auth/templates
2. Click on **"Magic Link"** template

### Step 2: Customize the Template

Replace the default template with this branded version:

```html
<h2>Welcome to GigLedger! 🎵</h2>

<p>Hi there,</p>

<p>You requested a magic link to sign in to your <strong>GigLedger</strong> account.</p>

<p>Click the button below to securely log in:</p>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Log In to GigLedger</a></p>

<p>Or copy and paste this link into your browser:</p>
<p style="color: #6b7280; word-break: break-all;">{{ .ConfirmationURL }}</p>

<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

<p style="font-size: 14px; color: #6b7280;">
  <strong>About GigLedger:</strong><br>
  GigLedger helps musicians and gig workers track income, expenses, and mileage for tax time. Manage your gigs, calculate deductions, and stay organized—all in one place.
</p>

<p style="font-size: 13px; color: #9ca3af; margin-top: 24px;">
  This link expires in 1 hour for your security.<br>
  If you didn't request this email, you can safely ignore it.
</p>

<p style="font-size: 12px; color: #9ca3af; margin-top: 16px;">
  © 2026 GigLedger. Track your music income & expenses.
</p>
```

### Step 3: Customize Subject Line (Optional)

In the same template editor, change the subject line from:
```
Your Magic Link
```

To:
```
Your GigLedger Login Link 🎵
```

### Step 4: Configure Sender Name (Recommended)

**Important:** Supabase uses `noreply@mail.app.supabase.io` by default. To use a custom sender:

1. Go to: https://supabase.com/dashboard/project/jvostkeswhfwntbrfzl/settings/auth
2. Scroll to **"SMTP Settings"** (requires paid plan)
3. Configure custom SMTP with your domain (e.g., `noreply@gigledger.com`)

**Note:** Custom SMTP requires:
- Paid Supabase plan (Pro or higher)
- Verified domain (SPF, DKIM records)
- SMTP credentials (e.g., SendGrid, AWS SES, Mailgun)

### Alternative: Free Tier Solution

If you're on the free tier, you can't change the sender email, but you can:
1. ✅ Customize the email body (as shown above)
2. ✅ Customize the subject line
3. ✅ Add GigLedger branding throughout the email

This makes it abundantly clear the email is from GigLedger, even though the sender shows Supabase.

### Step 5: Test the Email

1. Save the template in Supabase Dashboard
2. Go to your app: https://gigledger-ten.vercel.app
3. Click "Get Started" or "Sign In"
4. Enter your email and request a magic link
5. Check your inbox - the email should now have GigLedger branding

## What Users Will See (After Customization)

**Subject:** Your GigLedger Login Link 🎵

**From:** Supabase Auth <noreply@mail.app.supabase.io>

**Body:**
- Clear "Welcome to GigLedger! 🎵" heading
- Explanation that this is for GigLedger account
- Branded button: "Log In to GigLedger"
- Description of what GigLedger does
- Security note about 1-hour expiration
- GigLedger copyright footer

## Additional Customization Options

### For Signup vs. Sign In

You can create different templates for:
- **Magic Link** (existing users signing in)
- **Confirm Signup** (new users verifying email)

Both should have GigLedger branding for consistency.

### Confirm Signup Template

Go to: https://supabase.com/dashboard/project/jvostkeswhfwntbrfzl/auth/templates

Click **"Confirm Signup"** and use:

```html
<h2>Welcome to GigLedger! 🎵</h2>

<p>Hi there,</p>

<p>Thanks for signing up for <strong>GigLedger</strong>! We're excited to help you track your music income and expenses.</p>

<p>Click the button below to confirm your email and activate your account:</p>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Confirm Email & Get Started</a></p>

<p>Or copy and paste this link into your browser:</p>
<p style="color: #6b7280; word-break: break-all;">{{ .ConfirmationURL }}</p>

<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

<p style="font-size: 14px; color: #6b7280;">
  <strong>What's next?</strong><br>
  Once you confirm your email, you'll be able to:<br>
  • Track gigs and income<br>
  • Log expenses and mileage<br>
  • Calculate tax deductions<br>
  • Export reports for tax time
</p>

<p style="font-size: 13px; color: #9ca3af; margin-top: 24px;">
  This link expires in 24 hours for your security.<br>
  If you didn't create a GigLedger account, you can safely ignore this email.
</p>

<p style="font-size: 12px; color: #9ca3af; margin-top: 16px;">
  © 2026 GigLedger. Track your music income & expenses.
</p>
```

## QA Checklist

After customizing:
- [ ] Subject line mentions GigLedger
- [ ] Email body has "Welcome to GigLedger" heading
- [ ] Button text says "Log In to GigLedger"
- [ ] Description explains what GigLedger does
- [ ] Footer has GigLedger branding
- [ ] Test with real email - check inbox and spam folder
- [ ] Verify link works and logs user in successfully

## Future Enhancement: Custom Domain Email

To fully brand the sender email (e.g., `noreply@gigledger.com`):

1. **Upgrade to Supabase Pro plan** ($25/month)
2. **Set up SMTP provider** (SendGrid, AWS SES, or Mailgun)
3. **Configure DNS records** (SPF, DKIM, DMARC)
4. **Add SMTP settings in Supabase Dashboard**

This is optional but recommended for production apps to improve deliverability and trust.

---

## Quick Links

- **Email Templates:** https://supabase.com/dashboard/project/jvostkeswhfwntbrfzl/auth/templates
- **Auth Settings:** https://supabase.com/dashboard/project/jvostkeswhfwntbrfzl/settings/auth
- **Supabase Email Docs:** https://supabase.com/docs/guides/auth/auth-email-templates

---

**Status:** Ready to implement (no code changes needed, just Supabase Dashboard configuration)
