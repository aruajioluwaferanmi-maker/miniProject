# CI/CD Deployment Setup

This project now includes GitHub Actions workflows for CI and CD.

## Workflows

- `CI` workflow: `.github/workflows/ci.yml`
- `CD` workflow: `.github/workflows/cd.yml`

## Branch Strategy

- `staging` branch -> deploys to staging
- `main` branch -> deploys to production

You can also trigger CD manually from GitHub Actions using `workflow_dispatch`.

## Required GitHub Secrets

Add these in `GitHub repo -> Settings -> Secrets and variables -> Actions`:

- `STAGING_DEPLOY_HOOK_URL`
- `PRODUCTION_DEPLOY_HOOK_URL`

These are deploy webhook URLs from your hosting platform (for example Render, Railway, Netlify, or any service with deploy hooks).

## What CI checks

- Backend: `npm ci` + `npm test` in `/backend`
- Frontend: `npm ci` + `npm run build` in `/frontend`

## What CD does

1. Runs the same quality gate (backend tests + frontend build).
2. If successful, triggers the environment deploy hook:
   - staging hook for `staging`
   - production hook for `main`

## Optional hardening

- Add required reviewers on GitHub `production` environment.
- Add branch protection on `main` and `staging`.
- Add rollback commands to your hosting platform release pipeline.
