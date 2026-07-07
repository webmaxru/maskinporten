/**
 * Cookieless Real User Monitoring for the wizard site.
 *
 * Uses the dependency-free BEACON transport from `@webmaxru/cookieless-insights`:
 * no cookies, no localStorage/sessionStorage, only an in-memory session id — so
 * no consent/GDPR banner is required. Data lands in a workspace-based Azure
 * Application Insights (free tier, 30-day retention, 0.16 GB/day cap).
 *
 * The connection string is a PUBLIC client-side ingestion key, injected at build
 * time via the `VITE_APPINSIGHTS_CONNECTION_STRING` env var (a CI variable, never
 * a secret, never committed). When it is absent (e.g. local dev without an .env),
 * `init` is a safe no-op and nothing is sent.
 */
import { init, trackEvent, trackChangeDebounced } from '@webmaxru/cookieless-insights';

// ─── KILL SWITCH ─────────────────────────────────────────────────────────────
// Flip this one line to `false` to disable ALL telemetry (nothing initializes,
// nothing is ever sent).
const ANALYTICS_ENABLED = true;

init({
  connectionString: import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING,
  enabled: ANALYTICS_ENABLED,
  cloudRole: 'maskinporten-wizard',
  // Beacon transport + autoPageView (default true) → a page view is sent on load.
});

export { trackEvent, trackChangeDebounced };
