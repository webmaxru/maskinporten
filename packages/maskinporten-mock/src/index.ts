/**
 * maskinporten-mock — a credential-free local mock of the Maskinporten token endpoint.
 *
 * SCAFFOLD PLACEHOLDER. Full implementation tracked in plan.md (todo: mock-server):
 *   - POST /token       (validate JWT-bearer grant, issue mock access tokens)
 *   - GET  /.well-known/oauth-authorization-server + JWKS
 *   - GET  /authentication/api/v1/exchange/maskinporten (raw-quoted Altinn token)
 *   - scenario switches (unknown-scope, expired, clock-skew, extra-claim)
 *
 * Target: `startMockServer({ port, acceptedScopes, acceptedClientIds })`
 */

export interface MockServerOptions {
  port?: number;
  acceptedScopes?: string[];
  acceptedClientIds?: string[];
}

export const version = '0.0.0';
