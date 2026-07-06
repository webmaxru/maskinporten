import { exchangeMaskinportenTokenToAltinn } from './altinn';
import { MaskinportenError, errorFromResponse } from './errors';
import type { MaskinportenEnv } from './env';
import { resolveEndpoints } from './env';
import { createJwtAssertion, type MaskinportenKey } from './jwt';
import { createTokenCacheKey, TokenCache } from './token-cache';

export interface MaskinportenClientOptions {
  env: MaskinportenEnv;
  clientId: string;
  scope: string;
  key: MaskinportenKey;
  systemUserOrg?: string;
  tokenEndpoint?: string;
  audience?: string;
  altinnExchangeUrl?: string;
  assertionLifetimeSeconds?: number;
  refreshMarginSeconds?: number;
}

export interface MaskinportenClient {
  getToken(): Promise<string>;
  exchangeToAltinnToken(): Promise<string>;
  clearCache(): void;
}

interface TokenResponse {
  access_token?: unknown;
  expires_in?: unknown;
  token_type?: unknown;
  scope?: unknown;
}

const parseTokenResponse = (value: unknown): { accessToken: string; expiresIn: number } => {
  const body = value as TokenResponse;
  if (
    typeof body !== 'object' ||
    body === null ||
    typeof body.access_token !== 'string' ||
    typeof body.expires_in !== 'number'
  ) {
    throw new MaskinportenError('Maskinporten token response was missing access_token/expires_in.');
  }

  return { accessToken: body.access_token, expiresIn: body.expires_in };
};

export const createMaskinportenClient = (options: MaskinportenClientOptions): MaskinportenClient => {
  const endpoints = resolveEndpoints(options.env, {
    tokenEndpoint: options.tokenEndpoint,
    audience: options.audience,
    altinnExchangeUrl: options.altinnExchangeUrl,
  });
  const assertionLifetimeSeconds = options.assertionLifetimeSeconds ?? 100;
  const refreshMarginSeconds = options.refreshMarginSeconds ?? 10;
  const tokenCache = new TokenCache(
    createTokenCacheKey({
      clientId: options.clientId,
      scope: options.scope,
      env: options.env,
      systemUserOrg: options.systemUserOrg,
    }),
  );
  const altinnCache = new TokenCache(`altinn|${options.env}|${tokenCache.key}`);

  const requestToken = async (): Promise<string> => {
    const assertion = await createJwtAssertion({
      audience: endpoints.audience,
      clientId: options.clientId,
      scope: options.scope,
      key: options.key,
      lifetimeSeconds: assertionLifetimeSeconds,
      systemUserOrg: options.systemUserOrg,
    });
    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    });
    const response = await fetch(endpoints.tokenEndpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      throw await errorFromResponse(response);
    }

    const token = parseTokenResponse(await response.json());
    tokenCache.set(token.accessToken, token.expiresIn, refreshMarginSeconds);
    return token.accessToken;
  };

  const getToken = async (): Promise<string> => {
    const cached = tokenCache.get();
    if (cached) {
      return cached;
    }
    return tokenCache.singleFlight(requestToken);
  };

  const exchangeToAltinnToken = async (): Promise<string> => {
    const cached = altinnCache.get();
    if (cached) {
      return cached;
    }

    return altinnCache.singleFlight(async () => {
      const token = await exchangeMaskinportenTokenToAltinn(endpoints.altinnExchangeUrl, await getToken());
      altinnCache.set(token, 120, refreshMarginSeconds);
      return token;
    });
  };

  return {
    getToken,
    exchangeToAltinnToken,
    clearCache(): void {
      tokenCache.clear();
      altinnCache.clear();
    },
  };
};
