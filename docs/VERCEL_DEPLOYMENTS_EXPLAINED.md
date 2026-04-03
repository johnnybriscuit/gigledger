# Vercel Deployments Explained For This Project

## What This Document Is

This is a beginner-friendly explanation of what happens when this project deploys to Vercel.

If you are new to deployment, the short version is:

- deployment means turning code into a live website
- Vercel watches the GitHub repository
- when the right branch is updated, Vercel builds the app and publishes it

This document explains both how that works here and why the setup is designed that way.

## The Big Picture

For this project, the web app is deployed to Vercel.

That means Vercel is responsible for:

- building the web version of the app
- serving the static web files
- serving serverless functions inside `api/`
- applying route rewrites and security headers from `vercel.json`

In simple terms:

- GitHub stores the code
- Vercel turns that code into a live website

## What Triggers A Vercel Deployment

The exact production-branch setting lives in the Vercel project dashboard, not fully in the repo.

However, this repo’s existing deployment notes indicate the current setup is:

- push to `main`
- Vercel detects the new commit
- Vercel starts a deployment

You can see that expectation described in [DEPLOYMENT_WORKFLOW.md](/Users/johnburkhardt/dev/gigledger/DEPLOYMENT_WORKFLOW.md).

Why this is useful:

- you do not have to upload files manually
- deployment stays tied to source control history
- every live version can be traced back to a Git commit

## What Vercel Reads In This Repo

The main project-level configuration is in [`vercel.json`](/Users/johnburkhardt/dev/gigledger/vercel.json).

That file currently says:

- build command: `npx expo export --platform web && node inject-gtm.js`
- output directory: `dist`
- install command: `npm install`
- dev command: `npx expo start --web`

It also defines:

- rewrites for client-side routing
- security headers

## Step-By-Step: What Happens During Deployment

When Vercel sees a new commit it should deploy, the flow is roughly:

1. Vercel downloads the repo at that commit.
2. Vercel installs dependencies with `npm install`.
3. Vercel runs the build command from [`vercel.json`](/Users/johnburkhardt/dev/gigledger/vercel.json).
4. Expo exports the web app into the `dist` folder.
5. `inject-gtm.js` runs after the Expo export to add analytics-related markup.
6. Vercel publishes the `dist` folder as the live frontend.
7. Vercel also deploys files in `api/` as serverless functions.

Why it works this way:

- Expo is used to build the React Native web app
- Vercel needs a finished web output folder to host
- the app also needs backend-like endpoints for some features

## Why The Output Folder Is `dist`

The output directory is configured as `dist`.

Why this matters:

- it tells Vercel where the finished built app lives
- if this path were wrong, the deployment could succeed technically but serve the wrong files or no files at all

## Why The Build Command Uses `expo export`

This project uses:

```bash
npx expo export --platform web
```

Why:

- the app is built with Expo and React Native
- Expo converts the app into static web assets
- Vercel can host those assets efficiently

This is not the same as starting a local dev server.

That distinction matters:

- local dev is for fast iteration
- export is for producing deployable files

## Why `inject-gtm.js` Runs After The Build

The build command also runs:

```bash
node inject-gtm.js
```

Why:

- the project injects Google Tag Manager markup into the built output
- this is done after the Expo export step
- it ensures analytics code is present in the deployed site

## What Happens To The `api/` Folder

Files inside [`api/`](/Users/johnburkhardt/dev/gigledger/api) are deployed by Vercel as serverless functions.

Examples in this repo include:

- [`api/csrf-token.ts`](/Users/johnburkhardt/dev/gigledger/api/csrf-token.ts)
- [`api/auth/send-magic-link.ts`](/Users/johnburkhardt/dev/gigledger/api/auth/send-magic-link.ts)
- [`api/auth/signup-password.ts`](/Users/johnburkhardt/dev/gigledger/api/auth/signup-password.ts)
- [`api/invoices/public.ts`](/Users/johnburkhardt/dev/gigledger/api/invoices/public.ts)

Why these are needed:

- some work must happen securely on the server
- browser code should not hold secrets like service-role keys
- some features need request validation, CSRF handling, or third-party service access

Beginner rule of thumb:

- `src/` is mostly client app code
- `api/` is mostly server-side code executed by Vercel

## Why Rewrites Matter

The rewrite rule in [`vercel.json`](/Users/johnburkhardt/dev/gigledger/vercel.json) says that requests not starting with `/api/` should go to `/index.html`.

Why this exists:

- this is a single-page app
- the browser may request routes like `/auth/callback` or `/invoices/123`
- those routes are handled by the frontend router, not by separate physical HTML files

Without this rewrite:

- refreshing a deep link could return a 404

With this rewrite:

- Vercel serves the app shell
- the frontend router decides which screen to show

## Why Security Headers Are Set

[`vercel.json`](/Users/johnburkhardt/dev/gigledger/vercel.json) also adds headers like:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

Why this exists:

- it hardens browser behavior
- it reduces some classes of common web attacks
- it enforces safer defaults at the hosting layer

## What Vercel Does Not Deploy

This is one of the most important parts for beginners.

Vercel deploys:

- the web frontend
- the `api/` serverless routes

Vercel does not automatically deploy:

- Supabase database schema changes
- Supabase edge functions
- local `.env` files

Those are separate systems.

Examples:

- database migrations in `supabase/migrations/` must be applied to Supabase
- edge functions in `supabase/functions/` are deployed through Supabase tooling, not normal Vercel frontend deployment

This is why the repo also has [`.github/workflows/deploy-edge-functions.yml`](/Users/johnburkhardt/dev/gigledger/.github/workflows/deploy-edge-functions.yml).

## Environment Variables And Why They Matter

Vercel deployments depend on environment variables configured in the Vercel dashboard.

Typical examples in this project include:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SITE_URL`
- Stripe-related variables
- email-service variables

Why environment variables exist:

- they keep configuration separate from code
- they allow different values in local, preview, and production environments
- they keep secrets out of the client bundle when used correctly

Important beginner note:

- changing an environment variable in Vercel does not change your local `.env`
- changing your local `.env` does not update Vercel

They are separate places.

## Local Development Is Not The Same As Vercel

When you run the app locally with:

```bash
npm run start:web
```

you are running an Expo web development server.

Why that matters:

- it is excellent for editing and testing UI locally
- but it is not automatically the same as Vercel’s production runtime

In particular:

- local Expo web does not behave exactly like deployed Vercel serverless routes
- some `/api/*` behavior may require `vercel dev` or deployment to behave exactly the same

This is why local testing and deployed testing are both important.

## How To Think About The Deployment Flow

A good mental model is:

1. GitHub stores the code version.
2. Vercel reads that code version.
3. Vercel builds the web output.
4. Vercel publishes frontend files and API functions.
5. The live URL now points to that specific commit’s build.

Why this mental model is useful:

- it helps you debug where a problem lives
- if the code is correct locally but broken live, the issue may be build config, env vars, or deployment
- if the live site still looks old, the latest commit may not have deployed successfully

## Common Beginner Misunderstandings

### "If GitHub has the code, the site must already be updated"

Not always.

GitHub receiving the code is only the start.

The deployment can still fail because of:

- build errors
- missing environment variables
- runtime serverless issues
- incorrect platform configuration

### "Vercel deploys everything in the repo"

Not true.

Vercel deploys the web app and `api/` functions.

Supabase migrations and Supabase edge functions are separate deployment paths.

### "A local server proves production will work"

Not always.

Local and production differ in:

- environment variables
- hostname
- secrets
- serverless runtime behavior
- third-party integration configuration

## Practical Example

Imagine you change:

- a screen in `src/`
- an auth endpoint in `api/auth/`

After you push:

- Vercel rebuilds the frontend
- Vercel redeploys the affected API route
- the new live version contains both updates if the build succeeds

But if you also changed:

- `supabase/functions/process-receipt/index.ts`

that part needs the Supabase edge function deployment path too.

## How To Check A Deployment

A basic deployment verification process is:

1. open the Vercel dashboard
2. confirm the latest deployment finished successfully
3. confirm the deployment commit matches the GitHub commit you expect
4. open the live URL
5. test the changed feature
6. check function logs if something server-side fails

Why this matters:

- "deployment succeeded" and "feature works" are not identical
- a site can build successfully and still fail at runtime

## Final Takeaway

Vercel is the system that turns this repo into a live web app.

It does that by:

- pulling code from GitHub
- running the build command
- hosting the `dist` output
- deploying `api/` functions
- applying rewrites and headers from `vercel.json`

Understanding that flow makes it much easier to answer questions like:

- why did my push not go live?
- why does local behavior differ from deployed behavior?
- why did frontend deploy, but my Supabase function did not?
