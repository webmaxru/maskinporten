# maskinporten-wizard

Curated catalogue mapping Norwegian public-sector use-cases to Maskinporten scopes, Altinn resource URNs, portal links, and registration steps. It powers the `maskinporten-wizard` CLI and the wizard web app.

## Install or run

```bash
npm i maskinporten-wizard    # once published to npm
npx maskinporten-wizard      # once published to npm

# From this monorepo, before it is published:
pnpm wizard
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
