import { decodeJwt, decodeProtectedHeader, errors } from 'jose';
import type { MockScenario } from './scenarios';

export interface AssertionValidationOptions {
  acceptedScopes?: string[];
  acceptedClientIds?: string[];
  scenario?: MockScenario;
}

export interface ValidAssertion {
  issuer: string;
  scope: string;
  audience: string;
  authorizationDetails?: unknown;
}

export class MockOAuthError extends Error {
  readonly error: string;
  readonly status: number;

  constructor(error: string, description: string, status = 400) {
    super(description);
    this.name = 'MockOAuthError';
    this.error = error;
    this.status = status;
  }
}

const allowedClaims = new Set([
  'aud',
  'iss',
  'scope',
  'iat',
  'exp',
  'jti',
  'authorization_details',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const validateAssertion = (
  assertion: string,
  options: AssertionValidationOptions = {},
): ValidAssertion => {
  if (options.scenario === 'unknown-scope') {
    throw new MockOAuthError('invalid_scope', 'The requested scope is not accepted by this mock.');
  }
  if (options.scenario === 'expired-assertion') {
    throw new MockOAuthError('invalid_grant', 'The JWT assertion has expired.');
  }
  if (options.scenario === 'clock-skew') {
    throw new MockOAuthError('invalid_grant', 'The JWT assertion iat is too far in the future.');
  }
  if (options.scenario === 'extra-claim') {
    throw new MockOAuthError('invalid_request', 'The JWT assertion contains unsupported claims.');
  }

  let claims: Record<string, unknown>;
  try {
    decodeProtectedHeader(assertion);
    claims = decodeJwt(assertion);
  } catch (error) {
    if (error instanceof errors.JOSEError || error instanceof Error) {
      throw new MockOAuthError('invalid_request', 'The assertion is not a readable JWT.');
    }
    throw error;
  }

  const requiredClaims = ['aud', 'iss', 'scope', 'iat', 'exp', 'jti'] as const;
  for (const claim of requiredClaims) {
    if (!(claim in claims)) {
      throw new MockOAuthError('invalid_request', `The JWT assertion is missing ${claim}.`);
    }
  }

  for (const claim of Object.keys(claims)) {
    if (!allowedClaims.has(claim)) {
      throw new MockOAuthError('invalid_request', `The JWT assertion contains unsupported claim ${claim}.`);
    }
  }

  if (
    typeof claims.aud !== 'string' ||
    typeof claims.iss !== 'string' ||
    typeof claims.scope !== 'string' ||
    typeof claims.iat !== 'number' ||
    typeof claims.exp !== 'number' ||
    typeof claims.jti !== 'string'
  ) {
    throw new MockOAuthError('invalid_request', 'The JWT assertion has invalid claim types.');
  }

  if (claims.exp - claims.iat > 120) {
    throw new MockOAuthError('invalid_request', 'The JWT assertion lifetime exceeds 120 seconds.');
  }

  const now = Math.floor(Date.now() / 1000);
  if (claims.exp <= now) {
    throw new MockOAuthError('invalid_grant', 'The JWT assertion has expired.');
  }
  if (claims.iat > now + 10) {
    throw new MockOAuthError('invalid_grant', 'The JWT assertion iat is too far in the future.');
  }

  if (options.acceptedScopes?.length && !options.acceptedScopes.includes(claims.scope)) {
    throw new MockOAuthError('invalid_scope', 'The requested scope is not accepted by this mock.');
  }
  if (options.acceptedClientIds?.length && !options.acceptedClientIds.includes(claims.iss)) {
    throw new MockOAuthError('invalid_client', 'The client_id is not accepted by this mock.');
  }

  if ('authorization_details' in claims && !Array.isArray(claims.authorization_details)) {
    throw new MockOAuthError('invalid_request', 'authorization_details must be an array.');
  }

  return {
    issuer: claims.iss,
    scope: claims.scope,
    audience: claims.aud,
    authorizationDetails: isRecord(claims) ? claims.authorization_details : undefined,
  };
};
