# CI/CD Deployment Setup

This project now includes GitHub Actions workflows for CI and CD using Vercel for deployment.

## Workflows

- `CI` workflow: `.github/workflows/ci.yml`
- `CD` workflow: `.github/workflows/cd.yml`

## Scope

Current CD workflow deploys the `frontend` to Vercel.
The `backend` deployment should be handled by your backend host (Railway/Render/Fly/etc.) or a separate workflow.

## Branch Strategy

- `staging` branch -> deploys Vercel Preview
- `main` branch -> deploys Vercel Production

You can also trigger CD manually from GitHub Actions using `workflow_dispatch`.

## Required GitHub Secrets (Vercel)

Add these in `GitHub repo -> Settings -> Secrets and variables -> Actions`:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

You can get these from the Vercel dashboard:

- `Settings -> Tokens` for `VERCEL_TOKEN`
- Project `.vercel/project.json` for `orgId` and `projectId` (or run `vercel link` locally)

## What CI checks

- Backend: `npm ci` + `npm test` in `/backend`
- Frontend: `npm ci` + `npm run build` in `/frontend`

## What CD does

1. Runs the same quality gate (backend tests + frontend build).
2. If successful, deploys frontend to Vercel:
   - Preview deploy for `staging`
   - Production deploy for `main`

## Optional hardening

- Add required reviewers on GitHub `production` environment.
- Add branch protection on `main` and `staging`.
- Add rollback commands to your hosting platform release pipeline.
