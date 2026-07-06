import { readFile } from 'node:fs/promises';
import { createMaskinportenClient, MaskinportenError } from 'maskinporten';

export interface DoctorOptions {
  env?: 'test' | 'prod';
  clientId?: string;
  scope?: string;
  kid?: string;
  keyPath?: string;
  keyPem?: string;
  tokenEndpoint?: string;
  audience?: string;
  systemUserOrg?: string;
}

const generalChecklist = [
  'General checklist (the AUTH-00004 catch-all can mean any of these):',
  '  1. Right environment? test and prod are separate registrations.',
  '  2. Is the scope pre-authorized on THIS client by the API owner?',
  '  3. Is the public key (kid) registered on the client, and does the kid match?',
  '  4. iss must equal your client_id; aud must be the Maskinporten environment URL.',
  '  5. For systembruker: is the system user approved (confirmUrl + BankID)?',
];

function hintFor(error: MaskinportenError): string[] {
  const code = (error.code ?? '').toLowerCase();
  const description = (error.description ?? '').toLowerCase();

  if (description.includes('auth-00004') || code.includes('auth-00004')) {
    return ['AUTH-00004 is a catch-all from Altinn/Maskinporten — work through the checklist below.'];
  }
  if (code.includes('invalid_client')) {
    return [
      'The client_id is unknown in this environment, or the public key/kid is not registered on the client.',
    ];
  }
  if (code.includes('invalid_scope')) {
    return [
      'The scope is not granted to this client (ask the API owner to authorize it), or it is misspelled.',
    ];
  }
  if (code.includes('invalid_grant') || description.includes('assertion')) {
    return [
      'The JWT grant was rejected. Common causes: wrong aud (must be the environment issuer),',
      'iss not equal to client_id, exp too far ahead (>120s), clock skew, or a reused jti.',
    ];
  }
  return ['Check the client_id, the scope grant, the key/kid registration, and the environment.'];
}

function diagnose(error: unknown): string {
  if (!(error instanceof MaskinportenError)) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      `Unexpected error: ${message}`,
      'If this looks like a network/DNS error, check the token endpoint URL and connectivity.',
    ].join('\n');
  }

  const header: string[] = [];
  if (error.status) {
    header.push(`HTTP ${error.status}${error.code ? ` — ${error.code}` : ''}`);
  } else if (error.code) {
    header.push(error.code);
  }
  if (error.description) {
    header.push(`Server said: ${error.description}`);
  }

  return [
    ...header,
    '',
    'Likely cause & fix:',
    ...hintFor(error).map((line) => `  • ${line}`),
    '',
    ...generalChecklist,
  ].join('\n');
}

/**
 * Attempt a real Maskinporten token request (against the live service or a local mock via
 * --token-endpoint) and turn the notoriously opaque failures into an actionable diagnosis.
 */
export async function runDoctor(
  options: DoctorOptions = {},
  write: (message: string) => void = console.log,
): Promise<number> {
  const env = options.env === 'prod' ? 'prod' : 'test';
  const clientId = options.clientId ?? process.env.MASKINPORTEN_CLIENT_ID;
  const scope = options.scope ?? process.env.MASKINPORTEN_SCOPE;
  const kid = options.kid ?? process.env.MASKINPORTEN_KID;
  const keyPath = options.keyPath ?? process.env.MASKINPORTEN_PRIVATE_KEY_PATH;
  let keyPem = options.keyPem ?? process.env.MASKINPORTEN_PRIVATE_KEY;

  const missing: string[] = [];
  if (!clientId) missing.push('client id (--client-id or MASKINPORTEN_CLIENT_ID)');
  if (!scope) missing.push('scope (--scope or MASKINPORTEN_SCOPE)');
  if (!kid) missing.push('kid (--kid or MASKINPORTEN_KID)');
  if (!keyPem && !keyPath) {
    missing.push('private key (--key <path> or MASKINPORTEN_PRIVATE_KEY[_PATH])');
  }
  if (missing.length > 0) {
    write(
      `Missing configuration:\n${missing.map((item) => `  - ${item}`).join('\n')}\n\n` +
        'Tip: run `maskinporten-wizard init` to generate a keypair and .env.',
    );
    return 1;
  }

  if (!keyPem && keyPath) {
    try {
      keyPem = await readFile(keyPath, 'utf8');
    } catch {
      write(`Could not read the private key at "${keyPath}".`);
      return 1;
    }
  }

  const client = createMaskinportenClient({
    env,
    clientId: clientId as string,
    scope: scope as string,
    key: { pem: keyPem as string, kid: kid as string },
    ...(options.tokenEndpoint ? { tokenEndpoint: options.tokenEndpoint } : {}),
    ...(options.audience ? { audience: options.audience } : {}),
    ...(options.systemUserOrg ? { systemUserOrg: options.systemUserOrg } : {}),
  });

  write(`Requesting a token from Maskinporten (${env})…`);
  try {
    await client.getToken();
    write('✓ Success — Maskinporten issued a token. Your client_id, key, and scope are correctly wired.');
    return 0;
  } catch (error) {
    write('✗ Token request failed.\n');
    write(diagnose(error));
    return 1;
  }
}
