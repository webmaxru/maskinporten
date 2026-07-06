import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { JWK } from 'jose';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { isMockScenario } from './scenarios';
import { MockOAuthError, validateAssertion } from './validate';

export interface MockServerOptions {
  port?: number;
  acceptedScopes?: string[];
  acceptedClientIds?: string[];
}

export interface MockServer {
  url: string;
  port: number;
  close(): Promise<void>;
  publicJwk: JWK;
}

const json = (response: ServerResponse, status: number, body: unknown): void => {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
};

const text = (response: ServerResponse, status: number, body: string): void => {
  response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(body);
};

const oauthError = (response: ServerResponse, error: MockOAuthError): void => {
  json(response, error.status, {
    error: error.error,
    error_description: error.message,
  });
};

const readBody = (request: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new MockOAuthError('invalid_request', 'Request body is too large.', 413));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });

const getBaseUrl = (request: IncomingMessage, fallbackUrl: string): string => {
  const host = request.headers.host;
  return host ? `http://${host}` : fallbackUrl;
};

export const startMockServer = async (options: MockServerOptions = {}): Promise<MockServer> => {
  const keyPair = await generateKeyPair('RS256', { extractable: true });
  const kid = `mock-${randomUUID()}`;
  const publicJwk: JWK = {
    ...(await exportJWK(keyPair.publicKey)),
    kid,
    alg: 'RS256',
    use: 'sig',
  };

  let baseUrl = '';
  const server = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? '/', baseUrl || 'http://127.0.0.1');
      const scenarioHeader = Array.isArray(request.headers['x-mock-scenario'])
        ? request.headers['x-mock-scenario'][0]
        : request.headers['x-mock-scenario'];
      const scenarioCandidate = scenarioHeader ?? url.searchParams.get('scenario');
      const scenario = isMockScenario(scenarioCandidate) ? scenarioCandidate : undefined;

      if (request.method === 'GET' && url.pathname === '/.well-known/oauth-authorization-server') {
        const issuer = getBaseUrl(request, baseUrl);
        json(response, 200, {
          issuer,
          token_endpoint: `${issuer}/token`,
          jwks_uri: `${issuer}/jwks`,
        });
        return;
      }

      if (
        request.method === 'GET' &&
        (url.pathname === '/jwks' || url.pathname === '/.well-known/jwks.json')
      ) {
        json(response, 200, { keys: [publicJwk] });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/token') {
        const form = new URLSearchParams(await readBody(request));
        if (form.get('grant_type') !== 'urn:ietf:params:oauth:grant-type:jwt-bearer') {
          throw new MockOAuthError('unsupported_grant_type', 'Only JWT bearer grants are supported.');
        }

        const assertion = form.get('assertion');
        if (!assertion) {
          throw new MockOAuthError('invalid_request', 'Missing assertion.');
        }

        const valid = validateAssertion(assertion, {
          acceptedScopes: options.acceptedScopes,
          acceptedClientIds: options.acceptedClientIds,
          scenario,
        });
        const now = Math.floor(Date.now() / 1000);
        const accessToken = await new SignJWT({
          scope: valid.scope,
          authorization_details: valid.authorizationDetails,
        })
          .setProtectedHeader({ alg: 'RS256', kid })
          .setIssuer(getBaseUrl(request, baseUrl))
          .setSubject(valid.issuer)
          .setAudience(valid.audience)
          .setIssuedAt(now)
          .setExpirationTime(now + 120)
          .setJti(randomUUID())
          .sign(keyPair.privateKey);

        json(response, 200, {
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 120,
          scope: valid.scope,
        });
        return;
      }

      if (
        request.method === 'GET' &&
        url.pathname === '/authentication/api/v1/exchange/maskinporten'
      ) {
        const authorization = request.headers.authorization;
        if (!authorization?.startsWith('Bearer ')) {
          throw new MockOAuthError('invalid_token', 'Missing bearer token.', 401);
        }

        text(response, 200, JSON.stringify(`mock-altinn-${randomUUID()}`));
        return;
      }

      json(response, 404, { error: 'not_found', error_description: 'No mock route matched.' });
    })().catch((error: unknown) => {
      if (error instanceof MockOAuthError) {
        oauthError(response, error);
        return;
      }
      json(response, 500, {
        error: 'server_error',
        error_description: error instanceof Error ? error.message : 'Unknown mock server error.',
      });
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(options.port ?? 0, '127.0.0.1', resolve);
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    url: baseUrl,
    port: address.port,
    publicJwk,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
};
