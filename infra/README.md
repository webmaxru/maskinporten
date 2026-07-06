# Infra & deployment runbook (Azure, free tier)

Everything here is **free-tier**: Azure Static Web Apps (Free), Container Apps
(consumption + scale-to-zero, within the monthly free grant), a daily-capped Log
Analytics workspace, and public GHCR for the image. Custom domains + managed certs are
free; DNS is via Cloudflare.

> **None of this is needed to build/run the kit locally or against `maskinporten-mock`.**
> This is deployment-only.

## What gets deployed

| Component | Service | Notes |
|---|---|---|
| Scope wizard (`apps/wizard`) | Static Web Apps (Free) | static site, free SSL + custom domain |
| `maskinporten-mock` demo | Container Apps (consumption) | `minReplicas: 0`, public GHCR image |
| Logs | Log Analytics | `dailyQuotaGb` cap (the only metered dependency) |

## Register in advance (secrets / tokens)

For **GitHub Actions** deploys, set repo **secrets**:

| Secret | How to get it |
|---|---|
| `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` | an Entra app registration with **OIDC federated credentials** for this repo (no client secret) |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | `az staticwebapp secrets list -n <swa> --query properties.apiKey -o tsv` |

…and repo **variables**: `AZURE_RESOURCE_GROUP`, `AZURE_LOCATION` (e.g. `swedencentral`),
optionally `WIZARD_CUSTOM_DOMAIN`, `MOCK_CUSTOM_DOMAIN`.

The GHCR image must be **public** (Package → Settings → Change visibility) so Container
Apps can pull it without a registry secret.

## Manual deploy (local `az`)

```bash
RG=maskinporten-rg
az group create -n "$RG" -l swedencentral

# 1) Provision everything (SWA + Log Analytics + Container Apps env + mock app)
az deployment group create -g "$RG" \
  --template-file infra/main.bicep \
  --parameters mockImage=ghcr.io/webmaxru/maskinporten-mock:latest

# 2) Deploy the built wizard to Static Web Apps
pnpm --filter maskinporten-scopes build
pnpm --filter @wizard/site build
SWA=$(az deployment group show -g "$RG" -n main --query properties.outputs.staticWebAppName.value -o tsv)
TOKEN=$(az staticwebapp secrets list -n "$SWA" --query properties.apiKey -o tsv)
npx --yes @azure/static-web-apps-cli deploy apps/wizard/dist --deployment-token "$TOKEN" --env production

# 3) Roll the mock to a new image tag (after docker.yml pushes it)
az containerapp update -g "$RG" -n maskinporten-mock \
  --image ghcr.io/webmaxru/maskinporten-mock:latest

# 4) Smoke test
FQDN=$(az containerapp show -g "$RG" -n maskinporten-mock --query properties.configuration.ingress.fqdn -o tsv)
curl -fsS "https://$FQDN/.well-known/oauth-authorization-server"
```

## Custom domains (Cloudflare)

Managed certs are free on both services; add the DNS records in Cloudflare, then bind:

**Wizard (Static Web Apps):**
```bash
az staticwebapp hostname set -n <swa> --hostname wizard.example.no
# Add the CNAME / TXT validation record it prints, in Cloudflare (DNS-only, grey cloud).
```

**Mock (Container Apps):** add a CNAME to the app FQDN + the asuid TXT record, then:
```bash
az containerapp hostname add    -g "$RG" -n maskinporten-mock --hostname mock.example.no
az containerapp hostname bind   -g "$RG" -n maskinporten-mock --hostname mock.example.no \
  --environment maskinporten-env --validation-method CNAME
```

> ⚠️ A subsequent RG-scope Bicep deploy can wipe `ingress.customDomains`. The managed
> certificate persists at the environment level, so just re-run the `hostname bind` step
> (the `azure-deploy.yml` workflow has a re-bind step gated on `MOCK_CUSTOM_DOMAIN`).

## Free-tier caveats

- Container Apps consumption is free within the monthly grant; scale-to-zero keeps idle cost at 0.
- Log Analytics is the only metered dependency — the `dailyQuotaGb` cap bounds it. To go
  strictly $0 you can drop the workspace and rely on Container Apps console logs.
