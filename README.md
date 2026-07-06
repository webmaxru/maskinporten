# Maskinporten Tools

> **Norway's machine gate, made passable.**
> A TypeScript-first client, a credential-free local mock, and an interactive scope wizard for Maskinporten.

> **Live on Azure (free tier):**
> - **Wizard:** https://wonderful-water-0f1b97d03.7.azurestaticapps.net
> - **Mock demo** (token endpoint): https://maskinporten-mock.ambitiousflower-539d08fc.swedencentral.azurecontainerapps.io

[![npm](https://img.shields.io/npm/v/maskinporten.svg)](https://www.npmjs.com/package/maskinporten)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Maskinporten is the OAuth2 machine-to-machine backbone for ~50 Norwegian public-sector
APIs (Folkeregisteret, Skatteetaten, Altinn, KRR, Elhub…). Getting a token is a rite of
passage: build a JWT grant with exactly the right claims, sign it, exchange it, and — for
Altinn — exchange it *again*. Java and .NET have good libraries. **Node/TypeScript did not.**

This monorepo fixes that:

| Package | What it is |
|---|---|
| [`maskinporten`](./packages/maskinporten) | The client. One call → a cached, auto-renewing token. Altinn exchange + `systembruker` built in. |
| [`maskinporten-mock`](./packages/maskinporten-mock) | A local mock of the token endpoint. **Develop and CI-test with zero credentials.** `docker run` or `npx`. |
| [`maskinporten-wizard`](./packages/scopes-catalogue) | Scope catalogue **+ a CLI that does what a web page can't**: `init` (keypair + `.env` + client snippet) and `doctor` (real token request + failure decoder). |
| [`apps/wizard`](./apps/wizard) | The same wizard as a web page (GitHub Pages). |

## Quick start

```bash
npm i maskinporten
```

```ts
import { createMaskinportenClient } from 'maskinporten';

const client = createMaskinportenClient({
  env: 'test',
  clientId: process.env.MASKINPORTEN_CLIENT_ID!,
  scope: 'skatteetaten:formueinntekt/skattemelding',
  key: { pem: process.env.MASKINPORTEN_PRIVATE_KEY!, kid: process.env.MASKINPORTEN_KID! },
});

const token = await client.getToken();               // cached + auto-renewed
const altinnToken = await client.exchangeToAltinnToken();
```

### No credentials? No problem.

```bash
npx maskinporten-mock          # a local Maskinporten on http://localhost:6969
```

Point the client at it and everything works offline — perfect for tests and CI.

## Do I need to register anything in advance?

- **To contribute to this repo:** no. Everything runs against the mock.
- **To call real Maskinporten:** yes — a Norwegian org number, a signing key (self-generated
  JWK or a virksomhetssertifikat), a registered client, and pre-allocated scopes.
  **See [docs/prerequisites.md](./docs/prerequisites.md)** for the full checklist, and run the
  wizard to find the exact scopes for your use-case — `pnpm wizard` in this monorepo, or
  `npx maskinporten-wizard` once it's published to npm.

### Wizard CLI — scaffold & diagnose

The **web wizard** is for browsing "which scopes do I need?". The **CLI** does what a static
page can't (local keys + real network calls):

- `init` — generate an RS256 keypair, a `.env`, and a ready-to-run client snippet.
- `doctor` — attempt a **real** token request (against Maskinporten *or* a local
  `maskinporten-mock`) and **decode the failure** — the opaque `AUTH-00004`, wrong `aud`,
  ungranted scope, unapproved systembruker, etc.

```bash
# From this monorepo (before npm publish):
pnpm --filter maskinporten-wizard build
node packages/scopes-catalogue/dist/cli.js init --use-case read-folkeregisteret
node packages/scopes-catalogue/dist/cli.js doctor      # reads MASKINPORTEN_* env or flags

# Once published to npm:
npx maskinporten-wizard doctor
```

## Deploy (Azure, free tier)

The **wizard** runs on **Azure Static Web Apps (Free)** — live at
`https://wonderful-water-0f1b97d03.7.azurestaticapps.net`. The **`maskinporten-mock`
demo** runs on **Azure Container Apps** (consumption, scale-to-zero) from a public GHCR
image — live at
`https://maskinporten-mock.ambitiousflower-539d08fc.swedencentral.azurecontainerapps.io`.
Infra is Bicep; see **[infra/README.md](./infra/README.md)** for the one-shot `az`
runbook, the GitHub Actions workflows, and the register-in-advance secrets.

## Development

```bash
pnpm install
pnpm -r build
pnpm -r typecheck
pnpm -r test        # runs against maskinporten-mock — no secrets needed
pnpm lint
pnpm wizard         # run the scope-wizard CLI locally (no npm publish needed)
```

MIT © Maxim Salnikov ([@webmaxru](https://github.com/webmaxru))
