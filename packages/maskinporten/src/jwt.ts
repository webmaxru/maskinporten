import { randomUUID } from 'node:crypto';
import type { JWK, KeyLike } from 'jose';
import { importJWK, importPKCS8, SignJWT } from 'jose';
import { MaskinportenError } from './errors';
import { createSystembrukerAuthorizationDetails } from './systembruker';

type SigningAlgorithm = 'RS256' | 'PS256';

export type MaskinportenKey =
  | { pem: string; kid: string }
  | { jwk: JWK & { kid?: string; alg?: string }; kid?: string };

export interface JwtAssertionOptions {
  audience: string;
  clientId: string;
  scope: string;
  key: MaskinportenKey;
  lifetimeSeconds: number;
  systemUserOrg?: string;
  now?: Date;
}

const resolveKid = (key: MaskinportenKey): string => {
  const kid = 'pem' in key ? key.kid : (key.kid ?? key.jwk.kid);
  if (!kid) {
    throw new MaskinportenError('Maskinporten signing key requires a kid.');
  }
  return kid;
};

const resolveAlgorithm = (key: MaskinportenKey): SigningAlgorithm => {
  if ('jwk' in key && key.jwk.alg === 'PS256') {
    return 'PS256';
  }
  return 'RS256';
};

const importSigningKey = async (key: MaskinportenKey, alg: SigningAlgorithm): Promise<KeyLike | Uint8Array> => {
  if ('pem' in key) {
    return importPKCS8(key.pem, alg);
  }

  return importJWK(key.jwk, alg);
};

export const createJwtAssertion = async (options: JwtAssertionOptions): Promise<string> => {
  const kid = resolveKid(options.key);
  const alg = resolveAlgorithm(options.key);
  const nowSeconds = Math.floor((options.now?.getTime() ?? Date.now()) / 1000);
  const lifetimeSeconds = Math.min(options.lifetimeSeconds, 120);
  const claims: Record<string, unknown> = {
    aud: options.audience,
    iss: options.clientId,
    scope: options.scope,
    iat: nowSeconds,
    exp: nowSeconds + lifetimeSeconds,
    jti: randomUUID(),
  };

  if (options.systemUserOrg) {
    claims.authorization_details = createSystembrukerAuthorizationDetails(options.systemUserOrg);
  }

  const privateKey = await importSigningKey(options.key, alg);
  return new SignJWT(claims).setProtectedHeader({ alg, kid }).sign(privateKey);
};
