export type MaskinportenEnv = 'test' | 'prod';

export interface ResolvedEndpoints {
  tokenEndpoint: string;
  audience: string;
  altinnExchangeUrl: string;
}

const defaults: Record<MaskinportenEnv, ResolvedEndpoints> = {
  test: {
    // Re-verify exact Maskinporten endpoint and audience values against docs.digdir.no before GA.
    tokenEndpoint: 'https://test.maskinporten.no/token',
    audience: 'https://test.maskinporten.no/',
    altinnExchangeUrl:
      'https://platform.tt02.altinn.no/authentication/api/v1/exchange/maskinporten',
  },
  prod: {
    // Re-verify exact Maskinporten endpoint and audience values against docs.digdir.no before GA.
    tokenEndpoint: 'https://maskinporten.no/token',
    audience: 'https://maskinporten.no/',
    altinnExchangeUrl: 'https://platform.altinn.no/authentication/api/v1/exchange/maskinporten',
  },
};

export const resolveEndpoints = (
  env: MaskinportenEnv,
  overrides: Partial<ResolvedEndpoints>,
): ResolvedEndpoints => ({
  tokenEndpoint: overrides.tokenEndpoint ?? defaults[env].tokenEndpoint,
  audience: overrides.audience ?? defaults[env].audience,
  altinnExchangeUrl: overrides.altinnExchangeUrl ?? defaults[env].altinnExchangeUrl,
});
