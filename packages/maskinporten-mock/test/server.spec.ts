import { afterEach, describe, expect, it } from 'vitest';
import { generateKeyPair, importJWK, jwtVerify, SignJWT } from 'jose';
import type { MockServer } from '../src/server';
import { startMockServer } from '../src/server';

let server: MockServer | undefined;

const createAssertion = async (overrides: Record<string, unknown> = {}): Promise<string> => {
  const { privateKey } = await generateKeyPair('RS256');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    aud: server?.url ?? 'http://127.0.0.1',
    iss: 'test-client',
    scope: 'test:scope',
    iat: now,
    exp: now + 100,
    jti: crypto.randomUUID(),
    ...overrides,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .sign(privateKey);
};

const postToken = async (assertion: string, scenario?: string): Promise<Response> => {
  if (!server) {
    throw new Error('server not started');
  }

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  const url = scenario ? `${server.url}/token?scenario=${scenario}` : `${server.url}/token`;
  return fetch(url, { method: 'POST', body });
};

afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe('maskinporten-mock', () => {
  it('issues verifiable JWT access tokens and publishes JWKS', async () => {
    server = await startMockServer({ acceptedScopes: ['test:scope'], acceptedClientIds: ['test-client'] });
    const response = await postToken(await createAssertion());

    expect(response.status).toBe(200);
    const token = (await response.json()) as { access_token: string; expires_in: number; scope: string };
    expect(token.expires_in).toBe(120);
    expect(token.scope).toBe('test:scope');

    const jwks = (await (await fetch(`${server.url}/jwks`)).json()) as { keys: unknown[] };
    expect(jwks.keys).toHaveLength(1);
    const publicKey = await importJWK(server.publicJwk, 'RS256');
    const verified = await jwtVerify(token.access_token, publicKey, {
      issuer: server.url,
      audience: server.url,
    });
    expect(verified.payload.sub).toBe('test-client');
  });

  it('returns a quoted JSON string from the Altinn exchange endpoint', async () => {
    server = await startMockServer();
    const response = await fetch(`${server.url}/authentication/api/v1/exchange/maskinporten`, {
      headers: { Authorization: 'Bearer mock-token' },
    });

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body.startsWith('"mock-altinn-')).toBe(true);
    expect(JSON.parse(body)).toMatch(/^mock-altinn-/);
  });

  it.each(['unknown-scope', 'expired-assertion', 'clock-skew', 'extra-claim'])(
    'supports the %s error scenario',
    async (scenario) => {
      server = await startMockServer();
      const response = await postToken(await createAssertion(), scenario);
      const body = (await response.json()) as { error: string; error_description: string };

      expect(response.status).toBe(400);
      expect(body.error).toBeTruthy();
      expect(body.error_description).toBeTruthy();
    },
  );

  it('rejects assertions with unsupported extra claims', async () => {
    server = await startMockServer();
    const response = await postToken(await createAssertion({ extra: 'not allowed' }));
    const body = (await response.json()) as { error: string; error_description: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('invalid_request');
    expect(body.error_description).toContain('unsupported claim');
  });
});
