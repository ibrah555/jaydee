# JayDee POS

Phone-first Progressive Web App for JayDee Cosmetics.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development server:
   ```bash
   npm run dev
   ```

## Notes

- Uses React 18, Vite, TypeScript, Tailwind CSS, Dexie, Firebase, html5-qrcode.
- PWA support is configured in `vite.config.ts`.
- App scaffold includes login, dashboard, products, history, and settings pages.

## Deployment (Vercel)

1. Create a Vercel project connected to this repository.
2. Set the build command to:
   ```bash
   npm run build
   ```
   and the output directory to `dist`.
3. Add the required environment variables in the Vercel dashboard (Settings → Environment Variables):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Optional: enable Preview Deployments and set the production branch to `main`.

Notes:

### CI / GitHub Actions

This repository includes a GitHub Actions workflow (`.github/workflows/vercel-deploy.yml`) that builds and deploys to Vercel on pushes to `main` and creates preview deployments for pull requests.

Before using the workflow, add these repository secrets (Settings → Secrets → Actions):
- `VERCEL_TOKEN` — a Vercel team token (create in Vercel account settings).
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

The workflow passes the `VITE_` secrets to the Vercel CLI at deploy-time so they are available to the deployed preview/production build. You can also set environment variables directly in the Vercel dashboard for permanent storage.

### Serverless push endpoint (recommended)

To allow the Service Worker to perform reliable background pushes to Firestore, this project includes a Vercel serverless endpoint at `api/push-transaction.ts` which writes transactions to Firestore using a service account. This keeps credentialed access off the client.

Before deploying, set the `FIREBASE_SERVICE_ACCOUNT` repository secret (the JSON contents of a Firebase service account key) in GitHub or as a Vercel Environment Variable. The GitHub Actions workflow will forward the `VITE_` secrets to Vercel for client builds, but you must add `FIREBASE_SERVICE_ACCOUNT` directly to Vercel or GitHub Secrets for the server function.

The Service Worker will POST pending transactions to `/api/push-transaction` during background sync. The endpoint writes the transaction to the `transactions/{transactionId}` document and returns success/failure which the SW records back to IndexedDB.
