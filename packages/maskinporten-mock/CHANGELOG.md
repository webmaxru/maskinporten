# maskinporten-mock

## 0.1.1

### Patch Changes

- Release pipeline now publishes via npm OIDC trusted publishing (tokenless, with automatic provenance); documented the release flow in the README.

## 0.1.0

### Minor Changes

- First public release.

  - `maskinporten`: TypeScript-first client for Norway's Maskinporten — one-call cached tokens, Altinn token exchange, and `systembruker` support.
  - `maskinporten-mock`: credential-free local mock of the Maskinporten token endpoint (JWKS, Altinn exchange, error scenarios) via Docker and `npx`.
  - `maskinporten-wizard`: curated use-case → scope / Altinn resource-URN catalogue with an interactive CLI.
