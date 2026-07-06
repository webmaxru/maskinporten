# maskinporten

> **Norway's Maskinporten, made pleasant for developers.**
> A TypeScript-first client, a credential-free local mock, and an interactive scope wizard.

> **Wizard — live on Azure:** https://wonderful-water-0f1b97d03.7.azurestaticapps.net

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
| [`maskinporten-scopes`](./packages/scopes-catalogue) | A curated "which scopes / resource URNs do I need?" catalogue + the `maskinporten-wizard` CLI. |
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
  wizard (`npx maskinporten-wizard`) to find the exact scopes for your use-case.

## Deploy (Azure, free tier)

The **wizard** runs on **Azure Static Web Apps (Free)** — live at
`https://wonderful-water-0f1b97d03.7.azurestaticapps.net`. The **`maskinporten-mock`
demo** targets **Azure Container Apps** (consumption, scale-to-zero) from a public GHCR
image. Infra is Bicep; see **[infra/README.md](./infra/README.md)** for the one-shot
`az` runbook, the GitHub Actions workflows, and the register-in-advance secrets.

## Development

```bash
pnpm install
pnpm -r build
pnpm -r typecheck
pnpm -r test        # runs against maskinporten-mock — no secrets needed
pnpm lint
```

MIT © Maxim Salnikov ([@webmaxru](https://github.com/webmaxru))
