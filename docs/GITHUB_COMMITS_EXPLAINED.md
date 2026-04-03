# GitHub Commits Explained For This Project

## What This Document Is

This is a beginner-friendly explanation of what it means to "commit to GitHub" in this project.

If you are new to Git and GitHub, the short version is:

- Git is the tool on your computer that tracks code changes.
- GitHub is the website that stores a shared copy of the repository online.
- A commit is a saved checkpoint of your work.
- A push sends your commits from your computer to GitHub.

This project uses GitHub for:

- version history
- backup
- collaboration
- triggering automated checks
- triggering deployment-related systems

## The Big Picture

When you change code on your computer, nothing happens on GitHub until you push.

The normal flow is:

1. You edit files locally.
2. You stage the files you want included.
3. You create a commit with a message.
4. You push that commit to GitHub.
5. GitHub Actions may run automated checks.
6. Other systems, like Vercel, can react to that GitHub push.

## Important Terms

### Repository

A repository is the project folder tracked by Git. In this case, it is the `gigledger` codebase.

### Stage

Staging means choosing which changed files should go into the next commit.

Why this exists:

- it lets you commit only the changes you intend
- it helps keep history clean
- it reduces the risk of accidentally including unrelated edits

### Commit

A commit is a saved snapshot of your staged changes.

Why commits matter:

- they create a history you can review later
- they make it easier to understand why something changed
- they give you safe rollback points if something breaks

### Push

A push uploads your local commits to GitHub.

Why pushing matters:

- it backs up your work remotely
- it shares the changes with teammates and automation
- it is what allows GitHub-based workflows to start

### Branch

A branch is a line of development. The most important branch is usually `main`.

In this repo, the automation in [`.github/workflows/test.yml`](/Users/johnburkhardt/dev/gigledger/.github/workflows/test.yml) runs on pushes and pull requests involving `main` and `develop`.

## What Happens When You Commit

When you run a command like:

```bash
git commit -m "fix: correct invoice total display"
```

Git does these things:

- creates a new checkpoint in your local repository
- attaches your message to that checkpoint
- stores exactly which lines changed
- links the new checkpoint to the previous one

What it does not do:

- it does not upload anything yet
- it does not deploy anything yet
- it does not affect GitHub until you push

## What Happens When You Push

When you run:

```bash
git push
```

Git sends your local commits to the remote GitHub repository.

After that push, other systems can see the update.

For this repo, the main GitHub effects are:

- GitHub stores the new commit history online
- GitHub Actions can run automated checks
- Vercel can detect the new commit and begin a deployment workflow

## The GitHub Actions That Exist In This Repo

This repo currently has two GitHub workflow files:

- [`.github/workflows/test.yml`](/Users/johnburkhardt/dev/gigledger/.github/workflows/test.yml)
- [`.github/workflows/deploy-edge-functions.yml`](/Users/johnburkhardt/dev/gigledger/.github/workflows/deploy-edge-functions.yml)

### 1. Test Workflow

The test workflow runs when:

- code is pushed to `main`
- code is pushed to `develop`
- a pull request targets `main`
- a pull request targets `develop`

What it does:

1. checks out the repo
2. installs Node dependencies with `npm ci`
3. runs `npm run typecheck`
4. runs `npm test`
5. runs `npm run lint`

Why this exists:

- it catches broken code before or after merge
- it helps prevent deployments with obvious errors
- it gives confidence that changes did not break core behavior

### 2. Supabase Edge Function Deployment Workflow

The edge function workflow runs when:

- someone manually triggers it, or
- code is pushed to `main` and files inside `supabase/functions/**` changed, or
- code is pushed to `feature/receipt-first-ux` and files inside `supabase/functions/**` changed

What it does:

- installs the Supabase CLI
- deploys the `process-receipt` edge function to Supabase

Why this exists:

- Vercel deploys the web app and `api/*` serverless functions
- Supabase edge functions are a separate platform
- changing Supabase edge function code does not deploy automatically unless a workflow like this runs

This is an important beginner point:

- not every server-side thing in this project is deployed by Vercel
- some server-side code belongs to Supabase instead

## The Difference Between Local Work And GitHub Work

Before push:

- changes exist only on your machine
- GitHub cannot see them
- Vercel cannot react to them

After push:

- GitHub has them
- workflows can run
- deployment systems can begin

This is why "I changed the file" and "the live app changed" are not the same thing.

## Why Commit Messages Matter

A good commit message explains the intent of the change.

Examples:

```bash
git commit -m "fix: route public invoice links through tokenized API"
git commit -m "feat: add MFA verification step after auth callback"
git commit -m "docs: explain Vercel deployment flow for beginners"
```

Why this matters:

- future you can understand the history
- other people can scan what changed quickly
- rollback and debugging become easier

## The Quick Deploy Script In This Repo

This repo includes [`deploy.sh`](/Users/johnburkhardt/dev/gigledger/deploy.sh).

That script does the following:

1. shows changed files
2. asks for confirmation
3. runs `git add .`
4. creates a commit
5. runs `git push`

Why this script exists:

- it shortens the repetitive steps
- it makes pushing changes easier

Why you should still understand the manual steps:

- `git add .` stages everything, including files you may not have intended
- if you do not understand staging, it is easy to commit too much
- when something goes wrong, you need to understand what the script actually did

## A Safe Beginner Workflow

If you are learning, this is the safer way to work:

```bash
git status
git add path/to/file
git status
git commit -m "docs: explain GitHub commit flow"
git push
```

Why this is safer:

- you see exactly what changed
- you choose exactly what to stage
- you build understanding instead of treating Git like a black box

## Common Beginner Misunderstandings

### "I committed, so it should be live"

Not necessarily. A commit is local. It becomes visible to GitHub only after a push.

### "I pushed, so the site is definitely updated"

Not necessarily. After push:

- tests may fail
- deployment may fail
- environment variables may be wrong
- the deployed branch may not be the one you pushed

### "GitHub and Vercel are the same thing"

They are connected, but they do different jobs.

- GitHub stores code and runs repository automation
- Vercel builds and hosts the web app

## Recommended Mental Model

Think about the process in layers:

1. local computer
2. Git history
3. GitHub remote repository
4. automation
5. deployment

Each layer must succeed before the next one can happen.

## Practical Example

Imagine you fix a bug in invoice emails.

You make the code change locally.

Then:

```bash
git add src/screens/PublicInvoiceView.tsx supabase/functions/send-invoice-email/index.ts
git commit -m "fix: repair public invoice email link flow"
git push
```

After push:

- GitHub stores the commit
- GitHub Actions may run checks
- Vercel may start a new deployment
- if `supabase/functions/**` changed and the workflow conditions match, GitHub can also deploy the matching Supabase edge function

## Final Takeaway

A commit is a saved checkpoint.

A push publishes that checkpoint to GitHub.

Once GitHub has the change, automation can react to it.

That is why committing, pushing, testing, and deploying are related, but they are not the same action.
