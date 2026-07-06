// Scaffold placeholder for the Maskinporten scope wizard web app.
// The wizard reads the shared catalogue from `maskinporten-scopes` and renders an
// interactive "which scopes / resource URNs do I need?" flow. See plan.md → wizard-web.

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.innerHTML =
    '<main style="font-family:system-ui;max-width:40rem;margin:4rem auto;padding:0 1rem">' +
    '<h1>Maskinporten scope wizard</h1>' +
    '<p>Scaffold — the interactive flow is coming soon.</p>' +
    '</main>';
}
