import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { exportJWK, exportPKCS8, generateKeyPair } from 'jose';
import { findUseCase } from './index';

export interface InitOptions {
  useCaseId?: string;
  outDir?: string;
}

const buildSnippet = (scope: string): string =>
  `import { readFileSync } from 'node:fs';
import { createMaskinportenClient } from 'maskinporten';

const client = createMaskinportenClient({
  env: 'test',
  clientId: process.env.MASKINPORTEN_CLIENT_ID!,
  scope: ${JSON.stringify(scope)},
  key: {
    pem: readFileSync('./maskinporten-private.pem', 'utf8'),
    kid: process.env.MASKINPORTEN_KID!,
  },
});

const token = await client.getToken();
console.log('Got a Maskinporten token:', \`\${token.slice(0, 24)}…\`);
`;

/**
 * Generate a keypair + config scaffolding for a Maskinporten integration — the part a
 * static web page can't do (it writes local files, incl. a private key).
 */
export async function runInit(
  options: InitOptions = {},
  write: (message: string) => void = console.log,
): Promise<number> {
  const outDir = options.outDir ?? process.cwd();

  let scope = 'REPLACE_WITH_YOUR_SCOPE';
  if (options.useCaseId) {
    const useCase = findUseCase(options.useCaseId);
    if (!useCase) {
      write(`Unknown use-case "${options.useCaseId}". Run \`maskinporten-wizard\` to list them.`);
      return 1;
    }
    scope = useCase.scopes.join(' ');
  }

  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  const kid = `mp-${randomUUID()}`;
  const pem = await exportPKCS8(privateKey);
  const publicJwk = { ...(await exportJWK(publicKey)), kid, alg: 'RS256', use: 'sig' };

  await mkdir(outDir, { recursive: true });
  const privateKeyPath = join(outDir, 'maskinporten-private.pem');
  const publicJwkPath = join(outDir, 'maskinporten-public.jwk.json');
  const envPath = join(outDir, '.env.maskinporten');
  const snippetPath = join(outDir, 'maskinporten.example.ts');

  await writeFile(privateKeyPath, pem, 'utf8');
  await writeFile(publicJwkPath, `${JSON.stringify(publicJwk, null, 2)}\n`, 'utf8');
  await writeFile(
    envPath,
    [
      '# Maskinporten config. NEVER commit real values or the private key.',
      'MASKINPORTEN_ENV=test',
      'MASKINPORTEN_CLIENT_ID=',
      `MASKINPORTEN_KID=${kid}`,
      `MASKINPORTEN_SCOPE=${scope}`,
      'MASKINPORTEN_PRIVATE_KEY_PATH=./maskinporten-private.pem',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(snippetPath, buildSnippet(scope), 'utf8');

  const lines = [
    `✓ Generated an RS256 keypair and setup files in ${outDir}:`,
    '  - maskinporten-private.pem      (SECRET — never commit)',
    '  - maskinporten-public.jwk.json  (register this key on your Maskinporten client)',
    '  - .env.maskinporten             (fill MASKINPORTEN_CLIENT_ID after registering)',
    '  - maskinporten.example.ts       (ready-to-run client snippet)',
    '',
    `kid:   ${kid}`,
    `scope: ${scope}`,
  ];
  if (!options.useCaseId) {
    lines.push('', 'Tip: pass --use-case <id> to prefill the scope for a specific integration.');
  }
  lines.push(
    '',
    'Next steps:',
    '  1. Register the public JWK and request the scope in Samarbeidsportalen (Digdir).',
    '  2. Put the returned client_id in .env.maskinporten.',
    '  3. Verify it end-to-end with:  maskinporten-wizard doctor',
  );
  write(lines.join('\n'));
  return 0;
}
