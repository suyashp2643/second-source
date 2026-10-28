# Cloudflare Pages + Functions deployment

## What is ready

`npm run build:pages` creates `pages-dist` with the browser app, simulator static asset, API `_worker.js`, security headers and API-only function routing. The API Worker is approximately 6 KiB compressed; the simulator JavaScript (about 4 MB) and WebAssembly (about 6 MB) remain separate static files below Pages' 25 MiB per-asset limit. The build externalizes the package's embedded WASM URLs instead of allowing `data:` network access in the content policy. No ChatGPT-hosted runtime is required.

## Git-based deployment

1. Put this source in your GitHub repository. Do not commit `.env`, `.dev.vars`, `reference-models`, `node_modules` or deployment output.
2. In your Cloudflare account, create a **Pages** project and connect that repository.
3. Choose no framework preset, build command `npm run build:pages`, output directory `pages-dist`, production branch `main`. Use Node.js 24 (`NODE_VERSION=24` in build variables if needed).
4. Deploy. Offline mode works without provider credentials. Confirm the generated `pages.dev` URL using an actual simulation and export before recording the demo.

CLI alternative, after signing in to Cloudflare with Wrangler:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run build:pages
npx wrangler pages project create second-source --production-branch main
npm run deploy:pages
```

Project name availability must be checked in your account. No Cloudflare project or successful deployment is claimed until the provider confirms it.

## Live mode: two credential options

### Visitor-owned key

Click **Connect Nemotron**, select live mode and provide a session-only Nebius Token Factory key. This does not spend the site's shared provider credits. Keys are held in page memory, passed over the same-origin HTTPS proxy to the fixed Nebius endpoint, and excluded from run exports and browser storage.

### Shared demonstration key

Shared inference deliberately fails closed unless **all** required controls exist:

- Secret `NEBIUS_API_KEY`.
- Secret `DEMO_ACCESS_CODE`.
- D1 binding `BUDGET_DB`, with the quota migration applied.
- `DAILY_CALL_LIMIT`, default 100, an integer from 1 to 1000.

Create the budget database:

```bash
npx wrangler d1 create second-source-budget
```

Copy the returned ID into the commented D1 binding in `wrangler.toml` and uncomment the binding. Apply the schema:

```bash
npx wrangler d1 execute second-source-budget --remote --file migrations/0001_quota.sql
```

Add secrets through Cloudflare's dashboard or the CLI's interactive prompts:

```bash
npx wrangler pages secret put NEBIUS_API_KEY --project-name second-source
npx wrangler pages secret put DEMO_ACCESS_CODE --project-name second-source
```

Redeploy after bindings or secrets change. In the app, choose live mode and enter the demo access code. Treat the code as shared-demo access, not personal authentication. The atomic D1 reservation bounds provider attempts across isolates; upstream failures also consume a reservation. The quota is request-based, not an exact currency budget. Each call has a bounded completion-token setting. For billing protection also configure provider-side spending limits.

Never put either secret in GitHub source, build-time JavaScript, a public workflow variable, or the demo video. Preview environments should have their own quota database and secrets, or remain offline.

## Release checks

- `npm ci`, `npm test` and `npm run validate` succeed.
- No API key appears in `pages-dist`, source or exported evidence.
- A real NVIDIA Nemotron request succeeds through Nebius; record model ID, usage and request ID.
- The agent responds to an arbitrary changed requirement and respects locked changes.
- Default assumption sweep finds a modeled passing design; hot/high-load challenges may find none.
- Anonymous requests cannot use a shared key without the access code; exhausted quota refuses calls.
- Public repository, working public URL, license, README, feedback and a public video of at most three minutes are available.

Live provider testing, Cloudflare account deployment and GitHub upload require the corresponding authenticated access. They have not been silently simulated.

## Official references

- https://developers.cloudflare.com/pages/functions/advanced-mode/
- https://developers.cloudflare.com/pages/get-started/git-integration/
- https://developers.cloudflare.com/pages/functions/wrangler-configuration/
- https://developers.cloudflare.com/pages/functions/bindings/
