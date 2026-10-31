# Barwaqt Vendor Portal -- Test

Independent Next.js project based on the supplied vendor designs.

```sh
npm install
npm run dev
```

Open http://localhost:3001. Routes: `/` (sign-in), `/register` (three-step registration), `/dashboard` (vendor workspace).

Sign-in accepts a valid email or phone and a sample password of at least six characters. You can also choose **Explore demo dashboard**. Registration validates required fields, PDF/JPG/PNG uploads up to 5 MB, and a Pakistani IBAN. Use sample information only.

This is an interface preview: no authentication, file uploads, application submission, payments, notifications, or live business data are connected. Form inputs and dashboard edits stay in memory and reset on refresh. The CSV export downloads sample orders locally. Original reference images are included in `public`.

Checks: `npm run lint`, `npm run build`.

## CI/CD and production hosting

Pushes to `main` automatically validate and deploy to `/var/www/app.barwaqt.com`, using PM2 (`barwaqt-vendor`) on port 3001. Follow [Ubuntu, Nginx, HTTPS and GitHub setup](DEPLOYMENT.md) for the first deployment.

Products shows Pending review, Approved and Rejected states. New listings remain unpublished until admin approval; rejected products display the reason. Edit and save to resubmit. Changes to listing content or price require another review; stock-only updates do not. Enable/disable controls cannot bypass review. Deploy the backend product-moderation migration before this UI.

## Session and support updates

Support displays administrator-managed phone, second phone, email and WhatsApp contacts. Settings offers password change without social-provider linking. Session refresh is coordinated across auth and commerce routes; temporary service failures offer retry instead of logging out.

### SMS login

Administrator-registered vendors can enter their phone number and sign in with a six-digit SMS code. Email/password login remains available; public vendor signup remains disabled. The API must have the phone OTP migration and real Veevo SMS credentials configured. The vendor frontend stores successful verification tokens in HttpOnly cookies and rejects non-vendor accounts. No Veevo keys belong in frontend environment variables.
