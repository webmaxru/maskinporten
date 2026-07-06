# maskinporten-mock

Credential-free local mock of Norway's Maskinporten token endpoint. It lets apps and CI test JWT-grant token flows without a Norwegian organization, real client, or private production key.

## Run

```bash
npx maskinporten-mock
```

The default local endpoint is:

```text
http://localhost:6969/token
```

A Docker image is also intended for CI and language-agnostic tests.

## Use with the client

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
```

The mock is for development and automated tests. It is not a substitute for a final smoke test against `test.maskinporten.no` when you operate a real integration.
