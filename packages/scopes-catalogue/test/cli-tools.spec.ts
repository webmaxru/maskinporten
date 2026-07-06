import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportPKCS8, generateKeyPair } from 'jose';
import { afterEach, describe, expect, it } from 'vitest';
import type { MockServer } from 'maskinporten-mock';
import { startMockServer } from 'maskinporten-mock';
import { runInit } from '../src/init';
import { runDoctor } from '../src/doctor';

let mock: MockServer | undefined;

afterEach(async () => {
  await mock?.close();
  mock = undefined;
});

const testKeyPem = async (): Promise<string> => {
  const { privateKey } = await generateKeyPair('RS256', { extractable: true });
  return exportPKCS8(privateKey);
};

describe('init', () => {
  it('generates a keypair, env file, and client snippet', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mpw-init-'));
    const code = await runInit({ useCaseId: 'read-krr', outDir: dir }, () => {});

    expect(code).toBe(0);
    const pem = await readFile(join(dir, 'maskinporten-private.pem'), 'utf8');
    expect(pem).toContain('BEGIN PRIVATE KEY');
    const jwk = JSON.parse(await readFile(join(dir, 'maskinporten-public.jwk.json'), 'utf8')) as {
      kty: string;
      kid: string;
    };
    expect(jwk.kty).toBe('RSA');
    expect(jwk.kid.startsWith('mp-')).toBe(true);
    const env = await readFile(join(dir, '.env.maskinporten'), 'utf8');
    expect(env).toContain('MASKINPORTEN_SCOPE=');
    expect(env).toContain(`MASKINPORTEN_KID=${jwk.kid}`);
  });

  it('rejects an unknown use-case', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mpw-init-'));
    const code = await runInit({ useCaseId: 'does-not-exist', outDir: dir }, () => {});
    expect(code).toBe(1);
  });
});

describe('doctor', () => {
  it('reports success against a healthy token endpoint', async () => {
    mock = await startMockServer();
    const messages: string[] = [];
    const code = await runDoctor(
      {
        env: 'test',
        clientId: 'demo-client',
        scope: 'test:scope',
        kid: 'test-kid',
        keyPem: await testKeyPem(),
        tokenEndpoint: `${mock.url}/token`,
        audience: `${mock.url}/`,
      },
      (message) => messages.push(message),
    );

    expect(code).toBe(0);
    expect(messages.join('\n')).toContain('✓ Success');
  });

  it('diagnoses a rejected token request', async () => {
    mock = await startMockServer();
    const messages: string[] = [];
    const code = await runDoctor(
      {
        env: 'test',
        clientId: 'demo-client',
        scope: 'test:scope',
        kid: 'test-kid',
        keyPem: await testKeyPem(),
        tokenEndpoint: `${mock.url}/token?scenario=unknown-scope`,
        audience: `${mock.url}/`,
      },
      (message) => messages.push(message),
    );

    expect(code).toBe(1);
    expect(messages.join('\n')).toContain('Likely cause & fix');
  });

  it('fails fast when configuration is missing', async () => {
    const messages: string[] = [];
    const code = await runDoctor({ env: 'test' }, (message) => messages.push(message));

    expect(code).toBe(1);
    expect(messages.join('\n')).toContain('Missing configuration');
  });
});
