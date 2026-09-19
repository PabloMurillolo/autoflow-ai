# Deployment

## Static hosts

Use Node 22.12+ and `npm ci && npm run build`. Publish only `dist/`. Do not publish source environment files. Vite's `base: './'` keeps assets relative, including under `/autoflow-ai/`. No backend or secrets are needed.

## GitHub Pages

A convenient approach is to use a GitHub Actions workflow to run the build, upload `dist` with `actions/upload-pages-artifact`, and deploy with `actions/deploy-pages`. Select **GitHub Actions** in repository Settings → Pages first. Give the deployment job `pages: write` and `id-token: write`, and use the `github-pages` environment. Keep the validation job on pull requests separate from deployment, which should run only after validation on main.

Alternatively, build locally and publish the contents of `dist/` to a dedicated `gh-pages` branch, add an empty `.nojekyll`, then select that branch and `/ (root)` in Settings → Pages. Do not point Pages at the React source directory. The project does not need a custom domain.

The expected URL is `https://PabloMurillolo.github.io/autoflow-ai/` once Pages has been enabled and deployment has succeeded. Never present an expected URL as live without checking it.

References: [Vite static deployment](https://vite.dev/guide/static-deploy), [GitHub Pages setup](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Deployment smoke check

- The dashboard loads without asset errors at the host's actual subpath.
- Submit a fictional Spanish request, then find it in Leads.
- Refresh and verify it persists in the same browser.
- Change status, search, and filter.
- Open the app in a second browser: its records should be independent.
- Test narrow screens and keyboard navigation.

Production customer use requires a backend and authenticated owner access; static hosting alone does not add either.
