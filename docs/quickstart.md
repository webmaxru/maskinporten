# Quickstart

Install the client:

```bash
npm i maskinporten
```

## 1. Use the mock first

The fastest path needs no Maskinporten registration and no secrets.

```bash
npx maskinporten-mock
```

Then point the client at the mock endpoint:

```ts
import { generateKeyPairSync } from 'node:crypto';
import { createMaskinportenClient } from 'maskinporten';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = privateKey.export({ type: 'pkcs1', format: 'pem' }) as string;

const client = createMaskinportenClient({
  env: 'test',
  clientId: 'local-dev-client',
  scope: 'demo:read',
  key: { pem, kid: 'local-dev-key' },
  tokenEndpointOverride: 'http://localhost:6969/token',
  audienceOverride: 'http://localhost:6969/',
});

const token = await client.getToken();
console.log(token);
```

See [`examples/basic.ts`](../examples/basic.ts) for a runnable snippet.

## 2. Use real Maskinporten

Real Maskinporten needs a Norwegian organisasjonsnummer, Samarbeidsportalen access, a signing key, a registered `client_id`, and pre-allocated scopes. Do that first:

- Read [`prerequisites.md`](./prerequisites.md)
- Run the wizard to find the likely scopes and Altinn resource URNs:

```bash
pnpm wizard                 # from this monorepo (before npm publish)
npx maskinporten-wizard     # once published to npm
```

Then configure the client from environment variables or your secret store:

```ts
import { createMaskinportenClient } from 'maskinporten';

const client = createMaskinportenClient({
  env: 'test', // switch to 'prod' only after test is working
  clientId: process.env.MASKINPORTEN_CLIENT_ID!,
  scope: process.env.MASKINPORTEN_SCOPE!,
  key: {
    pem: process.env.MASKINPORTEN_PRIVATE_KEY!,
    kid: process.env.MASKINPORTEN_KID!,
  },
});

const token = await client.getToken();
```

Not sure it's wired correctly? Let the CLI attempt a real token request and decode any failure:

```bash
maskinporten-wizard doctor    # uses the MASKINPORTEN_* env vars above (or --flags)
```

## Altinn exchange

Altinn APIs often need a second exchange from a Maskinporten token to an Altinn token:

```ts
const altinnToken = await client.exchangeToAltinnToken();
```

The client handles the environment-specific Altinn platform endpoint and the raw quoted response.

## Systembruker example

For Altinn systembruker flows, pre-register the system and exact resource URNs in Altinn first. Then include the organization that owns the system user:

```ts
const systembrukerClient = createMaskinportenClient({
  env: 'test',
  clientId: process.env.MASKINPORTEN_CLIENT_ID!,
  scope: process.env.MASKINPORTEN_SCOPE!,
  key: {
    pem: process.env.MASKINPORTEN_PRIVATE_KEY!,
    kid: process.env.MASKINPORTEN_KID!,
  },
  systemUserOrg: '0192:991825827',
});

const token = await systembrukerClient.getToken();
```

Verify exact scopes, resource URNs, and audience values against [docs.digdir.no](https://docs.digdir.no/docs/Maskinporten/) and [docs.altinn.studio](https://docs.altinn.studio/).
