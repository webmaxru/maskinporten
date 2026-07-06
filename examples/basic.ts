import { generateKeyPairSync } from 'node:crypto';
import { createMaskinportenClient } from 'maskinporten';

// Start the local mock in another terminal for credential-free development:
//   npx maskinporten-mock
//
// For real Maskinporten, remove the endpoint overrides and provide real TEST or PROD
// values from your secret store. See docs/prerequisites.md before doing that.
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const devPrivateKeyPem = privateKey.export({ type: 'pkcs1', format: 'pem' }) as string;

const client = createMaskinportenClient({
  env: (process.env.MASKINPORTEN_ENV as 'test' | 'prod' | undefined) ?? 'test',
  clientId: process.env.MASKINPORTEN_CLIENT_ID ?? 'local-dev-client',
  scope: process.env.MASKINPORTEN_SCOPE ?? 'demo:read',
  key: {
    pem: process.env.MASKINPORTEN_PRIVATE_KEY ?? devPrivateKeyPem,
    kid: process.env.MASKINPORTEN_KID ?? 'local-dev-key',
  },
  tokenEndpointOverride: process.env.MASKINPORTEN_TOKEN_ENDPOINT ?? 'http://localhost:6969/token',
  audienceOverride: process.env.MASKINPORTEN_AUDIENCE ?? 'http://localhost:6969/',
});

const token = await client.getToken();
console.log(token);
