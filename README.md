# Barwaqt Vendor Portal

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
