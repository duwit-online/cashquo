

## Plan: Fix Bugs + Build Email System

This is a large set of changes across 7 areas. Here is the plan:

---

### 1. Fix Account Number Verification (SendMoney)

**Root cause**: One legacy account still has old format `ACC-caa203b9-3622` (17 chars). The verification query works fine for 11-digit accounts, but this old account can never be found since the input is restricted to 11 digits.

**Fix**: Run a migration to update any legacy account numbers to 11-digit numeric format. Also add a `SELECT` RLS policy so authenticated users can look up accounts by account_number (currently the query fails because non-admin users can only see their own accounts -- the recipient lookup returns nothing).

**Key insight**: The `accounts` table RLS only allows users to see their own rows. When user A tries to verify user B's account number, the query returns null. We need a database function `verify_account_number(acct_num TEXT)` that runs as `SECURITY DEFINER` to bypass RLS and return just the holder's name.

---

### 2. Fix User Deletion (Hard Delete via Edge Function)

**Problem**: Admin deletes from `profiles`, `accounts`, `transactions`, `user_roles`, `notifications` tables -- but does NOT delete from `auth.users`. The user still exists in auth, so re-creating with same email fails.

**Fix**: Create an `admin-delete-user` edge function that uses `adminClient.auth.admin.deleteUser(userId)` (service role). Update `Admin.tsx` to call this function instead of doing client-side deletes. The auth cascade + existing trigger cleanup will handle the rest, but we'll also explicitly delete from the public tables first.

---

### 3. Fix Notification Sound

**Problem**: The sound URL from `app_settings` may not load correctly, and the `accept` attribute on upload input already accepts `audio/*` which covers MP3/WAV/AAC. The real issue is likely the sound URL not being set or the Audio object failing silently.

**Fix**: 
- Ensure the upload stores files with cache-busting (add timestamp to filename)
- Add explicit MIME type support for all audio formats
- Move the realtime sound subscription to a global component (not just the Notifications page) so sounds play app-wide
- Create a `NotificationSoundProvider` component wrapping the app

---

### 4. Add "Test SMTP" Button

Add a `test-smtp` edge function that sends a test email to the admin's email using the configured SMTP/Resend settings from `app_settings`. Wire a "Test" button in the Admin Settings dialog.

---

### 5. Email Templates System

**New tables** (migration):
- `email_templates`: id, name, trigger_type (enum: signup, login, credit, debit, reversal, account_statement, new_login), subject, html_body, is_active, created_at, updated_at
- `email_logs`: id, recipient_email, trigger_type, template_id, status (sent/failed/pending), error_message, created_at

**Trigger types**: signup, login, credit, debit, reversal, account_statement, new_login

**Template variables**: `{account_name}`, `{email}`, `{account_number}`, `{sender}`, `{transaction_id}`, `{date}`, `{year}`, `{app_logo}`, `{signature}`, `{amount}`, `{transaction_type}`, `{description}`

**Edge functions**:
- `save-email-config`: Encrypted SMTP storage (upsert to app_settings)
- `send-email`: SMTP/Resend delivery + logging to email_logs
- `trigger-email`: Template lookup by trigger_type, variable replacement, calls send-email

**Auto-triggers**: Wire `trigger-email` into:
- Signup (in `handle_new_user` or via auth hook)
- Login (via auth state change on client)
- Credit/Debit (via the existing `notify_on_transaction` trigger or a new one)
- Update the `send-email-notification` function to use templates

---

### 6. Admin Email Management UI

**New route**: `/admin` gets an "Emails" tab/section with:
- **SMTP/Resend Config tab**: Current settings dialog content, plus "Test SMTP" button
- **Templates tab**: CRUD table of email templates with HTML editor, trigger type selector, variable insertion toolbar, and live preview panel
- **Email Logs tab**: Table showing all sent/failed/pending emails with recipient, trigger, status, error, timestamp

The template editor will be a dual-mode editor:
- **HTML mode**: Raw HTML textarea with syntax highlighting
- **Canvas mode**: Visual drag-and-drop builder using a simple block-based approach (header, text, button, image, divider blocks)
- Preview panel renders the template with sample data

---

### 7. Wire Auto-Triggers

- **Transaction trigger**: Modify the existing `notify_on_transaction` DB function (or add a new one) to also call the `trigger-email` edge function via `pg_net` or handle it client-side after transactions complete
- **Signup**: Call `trigger-email` from the Auth page after successful signup
- **Login**: Call `trigger-email` from the auth state change handler on new sign-in
- **Client-side approach** (simpler): After each action (send money, receive, signup, login), the frontend calls `trigger-email` with the appropriate trigger type and variables

---

### Technical Summary

**Database migrations**:
1. Fix legacy account numbers
2. Create `verify_account_number()` security definer function
3. Create `email_templates` table with RLS (admin only)
4. Create `email_logs` table with RLS (admin read, system insert)

**Edge functions** (new/updated):
1. `admin-delete-user` - Hard delete users from auth
2. `trigger-email` - Template lookup + variable replacement + send
3. `send-email` - Refactored email delivery with logging
4. `save-email-config` - Settings persistence

**Frontend files**:
1. `src/pages/SendMoney.tsx` - Use RPC for verification
2. `src/pages/Admin.tsx` - Major expansion with email tabs, template CRUD, logs viewer, test SMTP
3. `src/components/NotificationSoundProvider.tsx` - Global sound handler
4. `src/App.tsx` - Wrap with NotificationSoundProvider
5. `src/pages/Auth.tsx` - Trigger signup/login emails
6. `src/pages/Notifications.tsx` - Remove local sound logic (moved to provider)

