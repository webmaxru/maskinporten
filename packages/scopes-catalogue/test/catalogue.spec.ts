import { describe, expect, it } from 'vitest';
import { findUseCase, formatUseCase, getCatalogue } from '../src/index';
import { main } from '../src/cli';

describe('catalogue schema', () => {
  it('has unique ids and required fields', () => {
    const catalogue = getCatalogue();
    const ids = new Set<string>();

    expect(catalogue.version).toBe(1);
    expect(catalogue.useCases.length).toBeGreaterThanOrEqual(6);

    for (const useCase of catalogue.useCases) {
      expect(useCase.id.trim()).toBe(useCase.id);
      expect(useCase.id).not.toBe('');
      expect(useCase.title).not.toBe('');
      expect(useCase.scopes.length).toBeGreaterThan(0);
      expect(useCase.requestFrom.length).toBeGreaterThan(0);
      expect(useCase.steps.length).toBeGreaterThan(0);
      expect(useCase.portals.length).toBeGreaterThan(0);
      expect(ids.has(useCase.id)).toBe(false);
      ids.add(useCase.id);
    }
  });
});

describe('helpers and CLI', () => {
  it('finds and formats a known use-case', () => {
    const useCase = findUseCase('file-skattemelding-as');

    expect(useCase?.title).toBe('File the tax return (skattemelding) for an AS');
    expect(formatUseCase(useCase!)).toMatchInlineSnapshot(`
      "File the tax return (skattemelding) for an AS (file-skattemelding-as)
      Audience: system-provider

      Scopes:
        - skatteetaten:formueinntekt/skattemelding
        - altinn:instances.read
        - altinn:instances.write

      Altinn resources:
        - app_skd_formueinntekt-skattemelding-v2

      Request access from:
        - Skatteetaten
        - Altinn
        - Digdir Samarbeidsportalen

      Registration steps:
        1. Register and accept bruksvilkår in Samarbeidsportalen (Digdir).
        2. Generate a keypair (JWK) or obtain a virksomhetssertifikat.
        3. Register a Maskinporten client and request the Skatteetaten scope.
        4. For own-company filing, grant the client access for your own organisation.
        5. For system-provider filing, register your system in Altinn systemregister with the resource URNs above.
        6. Customers approve your system user via confirmUrl (BankID).

      Portals:
        - https://sjolvbetjening.samarbeid.digdir.no
        - https://docs.digdir.no/docs/Maskinporten/
        - https://docs.altinn.studio/authentication/systemauthentication/
        - https://www.skatteetaten.no/bedrift-og-organisasjon/skatt/skattemelding/

      Notes:
      Skattemelding can be used for own-company integrations or by system providers. System providers normally need Altinn systembruker/resource rights in addition to the Skatteetaten Maskinporten scope."
    `);
  });

  it('prints one use-case as JSON', async () => {
    const output: string[] = [];
    const exitCode = await main(['--id', 'file-skattemelding-as', '--json'], (message) =>
      output.push(message),
    );
    const parsed = JSON.parse(output.join('\n')) as { id: string; scopes: string[] };

    expect(exitCode).toBe(0);
    expect(parsed).toMatchObject({
      id: 'file-skattemelding-as',
      scopes: ['skatteetaten:formueinntekt/skattemelding', 'altinn:instances.read', 'altinn:instances.write'],
    });
  });
});
