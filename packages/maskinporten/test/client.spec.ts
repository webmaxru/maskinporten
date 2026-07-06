import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeJwt, exportJWK, generateKeyPair } from 'jose';
import { startMockServer, type MockServer } from 'maskinporten-mock';
import { createMaskinportenClient, MaskinportenError } from '../src/index';
import { errorFromResponse } from '../src/errors';

let server: MockServer | undefined;

const createKey = async () => {
  const { privateKey } = await generateKeyPair('RS256', { extractable: true });
  return { jwk: await exportJWK(privateKey), kid: 'client-key' };
};

afterEach(async () => {
  vi.restoreAllMocks();
  await server?.close();
  server = undefined;
});

describe('Maskinporten client', () => {
  it('caches tokens and deduplicates concurrent token requests', async () => {
    server = await startMockServer();
    const originalFetch = globalThis.fetch;
    let tokenRequests = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation((async (input, init) => {
      if (String(input).includes('/token')) {
        tokenRequests += 1;
      }
      return originalFetch(input, init);
    }) as typeof fetch);

    const client = createMaskinportenClient({
      env: 'test',
      clientId: 'test-client',
      scope: 'test:scope',
      key: await createKey(),
      tokenEndpoint: `${server.url}/token`,
      audience: `${server.url}/`,
      altinnExchangeUrl: `${server.url}/authentication/api/v1/exchange/maskinporten`,
    });

    const [first, second, third] = await Promise.all([
      client.getToken(),
      client.getToken(),
      client.getToken(),
    ]);
    expect(first).toBe(second);
    expect(second).toBe(third);
    expect(tokenRequests).toBe(1);
    expect(await client.getToken()).toBe(first);
    expect(tokenRequests).toBe(1);
  });

  it('renews tokens after the refresh margin expires the cache entry', async () => {
    server = await startMockServer();
    const client = createMaskinportenClient({
      env: 'test',
      clientId: 'test-client',
      scope: 'test:scope',
      key: await createKey(),
      tokenEndpoint: `${server.url}/token`,
      audience: `${server.url}/`,
      refreshMarginSeconds: 120,
    });

    const first = await client.getToken();
    const second = await client.getToken();

    expect(second).not.toBe(first);
  });

  it('exchanges to Altinn tokens and strips JSON string quotes', async () => {
    server = await startMockServer();
    const client = createMaskinportenClient({
      env: 'test',
      clientId: 'test-client',
      scope: 'test:scope',
      key: await createKey(),
      tokenEndpoint: `${server.url}/token`,
      audience: `${server.url}/`,
      altinnExchangeUrl: `${server.url}/authentication/api/v1/exchange/maskinporten`,
    });

    const token = await client.exchangeToAltinnToken();
    expect(token).toMatch(/^mock-altinn-/);
    expect(await client.exchangeToAltinnToken()).toBe(token);
  });

  it('sends systembruker authorization_details in the JWT grant', async () => {
    server = await startMockServer();
    const client = createMaskinportenClient({
      env: 'test',
      clientId: 'test-client',
      scope: 'test:scope',
      key: await createKey(),
      systemUserOrg: '0192:991825827',
      tokenEndpoint: `${server.url}/token`,
      audience: `${server.url}/`,
    });

    const token = await client.getToken();
    const claims = decodeJwt(token);
    expect(claims.authorization_details).toEqual([
      {
        type: 'urn:altinn:systemuser',
        systemuser_org: {
          authority: 'iso6523-actorid-upis',
          ID: '0192:991825827',
        },
      },
    ]);
  });

  it.each(['unknown-scope', 'expired-assertion', 'clock-skew', 'extra-claim'])(
    'maps %s scenario responses to MaskinportenError',
    async (scenario) => {
      server = await startMockServer();
      const client = createMaskinportenClient({
        env: 'test',
        clientId: 'test-client',
        scope: 'test:scope',
        key: await createKey(),
        tokenEndpoint: `${server.url}/token?scenario=${scenario}`,
        audience: `${server.url}/`,
      });

      await expect(client.getToken()).rejects.toMatchObject({
        name: 'MaskinportenError',
        status: 400,
      });
    },
  );

  it('maps error bodies without leaking sensitive inputs', async () => {
    const error = await errorFromResponse(
      new Response(JSON.stringify({ error: 'invalid_request', error_description: 'bad assertion' }), {
        status: 400,
      }),
    );

    expect(error).toBeInstanceOf(MaskinportenError);
    expect(error.code).toBe('invalid_request');
    expect(error.description).toBe('bad assertion');
    expect(error.message).not.toContain('PRIVATE KEY');
  });
});
