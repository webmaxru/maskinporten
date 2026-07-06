# maskinporten-wizard

Curated catalogue mapping Norwegian public-sector use-cases to Maskinporten scopes, Altinn resource URNs, portal links, and registration steps. It powers the `maskinporten-wizard` CLI and the wizard web app.

## Commands

- `maskinporten-wizard` — interactive scope lookup (also `--id <id> --json`).
- `maskinporten-wizard init [--use-case <id>]` — generate a keypair, `.env`, and a client snippet.
- `maskinporten-wizard doctor` — attempt a real token request and decode the failure.

```bash
npx maskinporten-wizard doctor      # once published to npm

# From this monorepo, before it is published:
pnpm --filter maskinporten-wizard build
node dist/cli.js doctor
```

## Minimal usage

```ts
import { getCatalogue } from 'maskinporten-wizard';

for (const useCase of getCatalogue().useCases) {
  console.log(useCase.name, useCase.scopes);
}
```

## Important

The catalogue is a guide, not an authority. Always verify exact scope strings, resource URNs, and audience URLs against [docs.digdir.no](https://docs.digdir.no/docs/Maskinporten/), [docs.altinn.studio](https://docs.altinn.studio/), and the API owner's documentation before registering a real client.
