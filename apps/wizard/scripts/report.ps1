#!/usr/bin/env pwsh
# Cookieless Application Insights engagement report for the Maskinporten wizard site.
#
# Prints page views, sessions, per-visit dwell, key events, top pages, geo, and
# browser/OS for the workspace-based App Insights `maskinporten-ai`. Requires
# `az login` first.
#
# Usage:
#   pwsh apps/wizard/scripts/report.ps1               # last 30 days
#   pwsh apps/wizard/scripts/report.ps1 -Days 7 -Open # last 7 days + open the Portal dashboard
param(
  [int]$Days = 30,
  [switch]$Open
)
$ErrorActionPreference = 'Stop'

$cliArgs = @(
  'report',
  '--resource-group', 'maskinporten-rg',
  '--app-insights', 'maskinporten-ai',
  '--days', "$Days"
)
if ($Open) { $cliArgs += '--open' }

& npx -y '@webmaxru/cookieless-insights@latest' @cliArgs
