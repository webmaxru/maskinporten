// maskinporten DX kit — Azure infra (free tier throughout)
//
// Provisions:
//   - Azure Static Web Apps (Free)         → the scope wizard (static site)
//   - Log Analytics (daily-capped)         → required by Container Apps
//   - Container Apps environment (consumption)
//   - Container App (maskinporten-mock)    → public demo, scale-to-zero, public GHCR image
//
// Custom domains are bound OUT of this template (in the deploy workflow / runbook),
// because an RG-scope deploy can wipe ingress.customDomains (managed cert persists at
// the environment level). See infra/README.md.

@description('Prefix for resource names.')
param namePrefix string = 'maskinporten'

@description('Location for Log Analytics + Container Apps.')
param location string = 'swedencentral'

@description('Location for the Static Web App (limited set of regions).')
@allowed(['westeurope', 'eastus2', 'centralus', 'westus2', 'eastasia'])
param swaLocation string = 'westeurope'

@description('Container image for the maskinporten-mock demo (public GHCR image).')
param mockImage string = 'ghcr.io/webmaxru/maskinporten-mock:latest'

@description('Daily ingestion cap (GB) for Log Analytics, to bound cost.')
@minValue(1)
param logDailyQuotaGb int = 1

@description('Suffix to keep the globally-scoped Static Web App name unique.')
param suffix string = uniqueString(resourceGroup().id)

@description('Deploy the mock Container App (+ its Log Analytics & environment). Set false to stand up only the wizard SWA before the container image exists.')
param deployMockApp bool = true

var laName = '${namePrefix}-log'
var envName = '${namePrefix}-env'
var mockName = '${namePrefix}-mock'
var swaName = '${namePrefix}-wizard-${suffix}'

resource la 'Microsoft.OperationalInsights/workspaces@2023-09-01' = if (deployMockApp) {
  name: laName
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: { dailyQuotaGb: logDailyQuotaGb }
    features: { enableLogAccessUsingOnlyResourcePermissions: true }
  }
}

resource containerEnv 'Microsoft.App/managedEnvironments@2024-03-01' = if (deployMockApp) {
  name: envName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        // Reference the symbolic resource so a dependency edge is created
        // (avoids the listKeys(resourceId(...)) ResourceNotFound race).
        customerId: la!.properties.customerId
        sharedKey: la!.listKeys().primarySharedKey
      }
    }
  }
}

resource mock 'Microsoft.App/containerApps@2024-03-01' = if (deployMockApp) {
  name: mockName
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 6969
        transport: 'auto'
        allowInsecure: false
      }
    }
    template: {
      containers: [
        {
          name: 'mock'
          image: mockImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'PORT', value: '6969' }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
    }
  }
}

resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: swaName
  location: swaLocation
  sku: { name: 'Free', tier: 'Free' }
  properties: {
    allowConfigFileUpdates: true
    stagingEnvironmentPolicy: 'Enabled'
  }
}

output staticWebAppName string = swa.name
output wizardUrl string = 'https://${swa.properties.defaultHostname}'
output mockUrl string = deployMockApp ? 'https://${mock!.properties.configuration.ingress.fqdn}' : ''
