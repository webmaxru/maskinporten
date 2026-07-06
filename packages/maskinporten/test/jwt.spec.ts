import { describe, expect, it } from 'vitest';
import { decodeJwt, decodeProtectedHeader, exportJWK, exportPKCS8, generateKeyPair, jwtVerify } from 'jose';
import { createJwtAssertion } from '../src/jwt';
import { MaskinportenError } from '../src/errors';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('JWT assertion creation', () => {
  it('creates the exact Maskinporten claim set with bounded lifetime', async () => {
    const { privateKey } = await generateKeyPair('RS256', { extractable: true });
    const pem = await exportPKCS8(privateKey);
    const assertion = await createJwtAssertion({
      audience: 'https://test.maskinporten.no/',
      clientId: 'client-id',
      scope: 'scope:a scope:b',
      key: { pem, kid: 'kid-1' },
      lifetimeSeconds: 100,
      now: new Date('2026-07-06T04:00:00.000Z'),
    });

    const header = decodeProtectedHeader(assertion);
    const claims = decodeJwt(assertion);
    expect(header).toEqual({ alg: 'RS256', kid: 'kid-1' });
    expect(Object.keys(claims).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'jti', 'scope']);
    expect(claims).toMatchObject({
      aud: 'https://test.maskinporten.no/',
      iss: 'client-id',
      scope: 'scope:a scope:b',
      iat: 1_783_310_400,
      exp: 1_783_310_500,
    });
    expect(claims.jti).toMatch(uuidPattern);
  });

  it('loads PEM and JWK keys and requires a kid', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
    const pem = await exportPKCS8(privateKey);
    const jwk = await exportJWK(privateKey);

    const pemAssertion = await createJwtAssertion({
      audience: 'audience',
      clientId: 'client',
      scope: 'scope',
      key: { pem, kid: 'pem-kid' },
      lifetimeSeconds: 100,
    });
    await expect(jwtVerify(pemAssertion, publicKey, { audience: 'audience' })).resolves.toBeTruthy();

    const jwkAssertion = await createJwtAssertion({
      audience: 'audience',
      clientId: 'client',
      scope: 'scope',
      key: { jwk, kid: 'jwk-kid' },
      lifetimeSeconds: 100,
    });
    await expect(jwtVerify(jwkAssertion, publicKey, { audience: 'audience' })).resolves.toBeTruthy();

    await expect(
      createJwtAssertion({
        audience: 'audience',
        clientId: 'client',
        scope: 'scope',
        key: { jwk },
        lifetimeSeconds: 100,
      }),
    ).rejects.toBeInstanceOf(MaskinportenError);
  });

  it('adds only the systembruker authorization_details claim when requested', async () => {
    const { privateKey } = await generateKeyPair('RS256', { extractable: true });
    const jwk = await exportJWK(privateKey);
    const assertion = await createJwtAssertion({
      audience: 'audience',
      clientId: 'client',
      scope: 'scope',
      key: { jwk, kid: 'kid' },
      lifetimeSeconds: 130,
      systemUserOrg: '0192:991825827',
    });
    const claims = decodeJwt(assertion);

    expect(claims.exp as number).toBe((claims.iat as number) + 120);
    expect(Object.keys(claims).sort()).toEqual([
      'aud',
      'authorization_details',
      'exp',
      'iat',
      'iss',
      'jti',
      'scope',
    ]);
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
});
