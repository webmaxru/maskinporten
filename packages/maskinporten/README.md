# maskinporten

TypeScript-first client for Norway's Maskinporten: one call for cached, auto-renewing tokens, with Altinn exchange and `systembruker` support.

## Install

```bash
npm i maskinporten
```

## Minimal usage

```ts
import { createMaskinportenClient } from 'maskinporten';

const client = createMaskinportenClient({
  env: 'test',
  clientId: process.env.MASKINPORTEN_CLIENT_ID!,
  scope: process.env.MASKINPORTEN_SCOPE!,
  key: {
    pem: process.env.MASKINPORTEN_PRIVATE_KEY!,
    kid: process.env.MASKINPORTEN_KID!,
  },
});

const token = await client.getToken();
const altinnToken = await client.exchangeToAltinnToken();
```

## No credentials?

Use [`maskinporten-mock`](../maskinporten-mock) and endpoint overrides for local development and CI.

## Before real Maskinporten

Read [`../../docs/prerequisites.md`](../../docs/prerequisites.md). Real access requires a Norwegian organisasjonsnummer, Samarbeidsportalen/Digdir setup, a signing key, a registered `client_id`, and scopes granted by the API owner.
