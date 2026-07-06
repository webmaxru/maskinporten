# Prerequisites

> The important bit: **contributing to this repo needs no Norwegian organization, no Maskinporten registration, and no secrets.** The kit is mock-first on purpose.

This page separates three very different audiences: contributors, maintainers, and teams that want to call the real Maskinporten.

## 1. To contribute to this repo

Nothing special.

You need normal developer tooling only: Node 20+, pnpm, and optionally Docker for running `maskinporten-mock`. The client, tests, examples, and CI are designed to run against the mock. No organisasjonsnummer, no Samarbeidsportalen account, no private key, no API owner approval.

If you are opening a PR, **do not add real credentials**. Use the mock.

## 2. To publish or operate the kit

Maintainers need release and hosting credentials for npm, GHCR, and the wizard site. These are repo/CI concerns, not Maskinporten concerns.

| Setup / secret | Purpose | Preferred setup | Notes |
|---|---|---|---|
| npm Trusted Publishing | Publish `maskinporten`, `maskinporten-mock`, and `maskinporten-scopes` with provenance | Configure npm OIDC Trusted Publishing for the GitHub Actions release workflow | Preferred: no long-lived npm token stored in GitHub. |
| `NPM_TOKEN` | Fallback npm publishing | GitHub Actions repository secret | Use only if Trusted Publishing is not available for the package. Use an automation token with the smallest useful scope. |
| Built-in `GITHUB_TOKEN` | Push the `maskinporten-mock` image to GHCR and deploy GitHub Pages | Workflow permissions: `packages: write` for GHCR; Pages permissions for the wizard | No manual secret to create. The repository/package may still need Actions access enabled in GitHub settings. |
| Cloudflare DNS token (optional) | Custom domain for the wizard | GitHub Actions secret, only for a vanity domain | GitHub Pages works without this. Use only if the project wants a custom wizard domain. |

## 3. To call the real Maskinporten

Real Maskinporten access is the bureaucratic cliff. You need a registered Norwegian organization, a registered client, a signing key, and scopes granted by the API owner before the token call succeeds.

Run the wizard first:

```bash
npx maskinporten-wizard
```

It points you at the likely scopes, Altinn resource URNs, and registration steps for your use-case. Still verify exact values and URLs against [docs.digdir.no](https://docs.digdir.no/docs/Maskinporten/) and the API owner's documentation.

### Ordered checklist

1. **Norwegian organisasjonsnummer**

   A real client belongs to a Norwegian organization: AS, enkeltpersonforetak, public agency, or another registered entity. Without an organisasjonsnummer you cannot register a production Maskinporten client. Use `maskinporten-mock` instead.

2. **Samarbeidsportalen / Digdir access and bruksvilkår**

   Get access to Digdir's Samarbeidsportalen and accept the relevant bruksvilkår (terms). For production, a **bemyndiget person** (authorized person) must log in with ID-porten and grant administration access to specific fødselsnummer. Plan this early; it is an organizational step, not a code step.

3. **A signing key**

   Choose one of these paths:

   - **Self-generated RSA keypair → JWK**: free and simplest for most integrations. Generate a private key, register the public JWK, and keep the private key secret.

     ```bash
     openssl genrsa -out private.pem 2048
     ```

     The JWK **`kid` must be globally unique** across Maskinporten customers. Do not reuse a generic value like `default` or `my-key`.

   - **Virksomhetssertifikat**: an enterprise certificate from **Commfides** or **Buypass**. Expect procurement, a `.p12` file, annual renewal, and roughly **1000 NOK/year**. Keep test and production certificates separate.

4. **Register a Maskinporten client**

   Register the client in Samarbeidsportalen / the current Digdir administration UI and obtain a **`client_id`**. Endpoint names and portal URLs can change; verify the current flow at [docs.digdir.no](https://docs.digdir.no/docs/Maskinporten/).

5. **Scope pre-allocation**

   Maskinporten scopes are not requested ad-hoc at runtime. The API owner must grant or authorize the exact scopes to your client in advance. Examples often look like `skatteetaten:...` or `altinn:...`, but **do not invent scope strings**: use the wizard as a starting point, then verify against the API owner and Digdir docs.

6. **If you use Altinn systembruker**

   Register the system in the Altinn systemregister with the exact **resource URNs** it needs. Then create a systemuser request. The customer approves the request via the returned `confirmUrl` using **BankID**. See [docs.altinn.studio](https://docs.altinn.studio/) and verify exact resource URNs for your service.

7. **Use the test environment before production**

   Use `test.maskinporten.no` for Maskinporten, Altinn `tt02` for Altinn, and **Skatteetaten Tenor** synthetic persons/orgs when testing tax-related flows. Test certificates, clients, and data are separate from production. Do not assume a production key or scope also exists in test, or the other way around.

> [!WARNING]
> **Secrets to guard, never commit**
>
> - Private signing key: PEM, JWK, or `.p12`
> - `client_id`
> - `kid`
>
> Load these from environment variables or a secret store. For optional real E2E in CI, store only a **test** client's key and id as GitHub Actions secrets, name them clearly (for example `MASKINPORTEN_TEST_*`), and skip the workflow when they are absent.

## Useful links

- Maskinporten documentation: <https://docs.digdir.no/docs/Maskinporten/>
- Altinn documentation: <https://docs.altinn.studio/>
- Scope wizard: `npx maskinporten-wizard`
