# BrightHive enrollment submissions

The after-school and art application forms submit directly to the Supabase Edge Function `enrollment-request`. The function saves every valid application in the private `public.enrollment_inquiries` table before trying to send an email notification. The hidden `Website` field is a honeypot; values submitted into it are discarded.

## Deploy the database and function

1. In Supabase Dashboard, open **SQL Editor** for project `hkbkkuwtcyvsmzvkfyeq` and run `supabase-enrollment-inquiries-migration.sql` from this folder. The table is private to the service role for writes; authenticated staff can read it through the staff policy.
2. In **Edge Functions**, create or open `enrollment-request` and deploy `supabase/functions/enrollment-request/index.ts`. Keep `verify_jwt = false`; the function validates the origin, fields, and consent itself.
3. Confirm the table appears in **Table Editor → public → enrollment_inquiries**. A real form submission should create a row even when email notification is not configured.

## Email notifications

The Supabase project currently has no custom Edge Function secrets. To receive an email notification for each saved request, first verify a sender address/domain in Resend, then add these values in **Edge Functions → Secrets**:

- `RESEND_API_KEY`: the Resend API key.
- `RESEND_FROM_EMAIL`: a sender address verified by Resend, such as `BrightHive Admissions <admissions@your-verified-domain.com>`.

The site never contains the Resend key. Missing email secrets do not block saving a family application; the record remains in Supabase with `notification_status = 'not_configured'`. Delivery failures are recorded as `failed`, and successful messages are marked `sent`.

Do not put service-role keys, Resend keys, or other private credentials in website files or chat.