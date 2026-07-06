# Launch kit — `maskinporten`

Ready-to-use launch assets for the Norwegian developer community. **Drafts only — review
before posting.** Nothing here has been published.

**Facts (verified):**
- Repo: https://github.com/webmaxru/maskinporten (MIT, public)
- Wizard (live): https://wonderful-water-0f1b97d03.7.azurestaticapps.net
- Mock demo (live): https://maskinporten-mock.ambitiousflower-539d08fc.swedencentral.azurecontainerapps.io
- 4 packages: `maskinporten` (client), `maskinporten-mock`, `maskinporten-wizard` (scope catalogue + CLI), the web wizard.
- 22 tests green; mock-first (build & CI with **zero** Norwegian credentials).

**The story (Problem → Solution → Impact → Hook):**
- **Problem:** Maskinporten is the M2M backbone for ~50 Norwegian public APIs. Java & .NET have solid libraries; **Node/TypeScript had no published client** — every team hand-rolls ~110 lines of `axios + jsonwebtoken`, and testing means hitting the real test environment with real org credentials.
- **Solution:** a small kit — `npm i maskinporten` (cached tokens + Altinn exchange + systembruker), a **credential-free local mock** (`npx maskinporten-mock`) so you build & CI-test offline, and a **"which scopes do I need?" wizard** (the decision tree everyone asks for).
- **Hook:** *allemannsdata.com* showed how much the NO dev community loves public-data-as-dev-tooling. This fills the tier it skips — the **gated** APIs behind Maskinporten — and makes the auth "bureaucratic cliff" a one-liner.

---

## 1) LinkedIn post (@webmaxru — personal, technical)

> **Norway's public APIs have a Node.js-shaped hole. I just filled it. 🇳🇴**
>
> Maskinporten is the OAuth2 machine-to-machine backbone for ~50 Norwegian public-sector
> APIs — Folkeregisteret, Skatteetaten, Altinn, KRR, Elhub… Java and .NET have great
> libraries for it. Node/TypeScript? Nothing published. So every team re-writes the same
> ~110 lines of JWT-grant + token-exchange glue, and "just write an integration test"
> means wrangling real org credentials against the test environment.
>
> So I built **`maskinporten`** — an open-source (MIT) developer kit:
>
> 🔑 `npm i maskinporten` → one call for a cached, auto-renewing token. Altinn token
> exchange and `systembruker` built in.
> 🧪 `npx maskinporten-mock` → a credential-free local mock of the token endpoint. Build
> and CI-test with **zero** Norwegian credentials. (This is the part I'm most happy about.)
> 🧭 `npx maskinporten-wizard` → the "which scopes / Altinn resource URNs do I actually
> need?" decision tree — as a CLI *and* a web app.
>
> Try it live (both free-tier on Azure): wizard 👉 [link] · hosted mock 👉 [link]
> Code, docs, and the full "register in advance" checklist 👉
> https://github.com/webmaxru/maskinporten
>
> Built in the open, deployed on free-tier Azure (Static Web Apps + Container Apps,
> scale-to-zero). If you integrate Norwegian public APIs from Node — I'd love your issues
> and PRs. What should the mock simulate next?
>
> #NorDev #TypeScript #Maskinporten #Altinn #OpenSource #Azure

*Tips: post Tue–Thu morning (Oslo). Attach the 20s demo GIF (§4). First comment: drop the
GitHub link again + tag a couple of NO dev friends.*

---

## 2) X / Twitter (thread)

**Tweet 1 (hook):**
> Norway's Maskinporten (the M2M auth backbone for ~50 public APIs) had solid Java/.NET
> libs but *no* published Node client. So everyone hand-rolls the same JWT glue.
> I fixed that. Open source, MIT 👇

**Tweet 2:**
> `npm i maskinporten` → cached tokens + Altinn exchange + systembruker in one call.
> `npx maskinporten-mock` → a credential-free local mock. Build & CI-test with ZERO
> Norwegian credentials. 🧪

**Tweet 3:**
> Plus a `maskinporten-wizard` that tells you exactly which scopes + Altinn resource URNs
> your use-case needs (CLI + web).
> Live demos (free-tier Azure) + code:
> https://github.com/webmaxru/maskinporten
> #NorDev #TypeScript

---

## 3) kode24 tip / pitch (email — English draft; can translate to Norwegian)

> **Subject: Open-source: the missing Node/TypeScript toolkit for Maskinporten**
>
> Hi kode24,
>
> Quick tip that might interest your readers. Maskinporten is the auth backbone for ~50
> Norwegian public APIs, but Node/TypeScript developers have never had a published client
> — everyone re-implements the same JWT-grant + Altinn-exchange glue, and there's no easy
> way to test it without real org credentials.
>
> I just open-sourced **`maskinporten`** (MIT): a TypeScript client, a **credential-free
> local mock** so you can develop and run CI with no Norwegian org/certificate at all, and
> an interactive "which scopes do I need?" wizard (the decision tree the community keeps
> asking for). It rides the same "public sector + developer tooling" wave as
> allemannsdata.com — but targets the *gated* tier that the open-data tools skip.
>
> Everything's live and free to try (deployed on free-tier Azure):
> - Repo: https://github.com/webmaxru/maskinporten
> - Wizard: [link] · Hosted mock: [link]
>
> Happy to write a guest piece or answer questions.
>
> Best, Maxim Salnikov (@webmaxru)

*Also share in the "Norsk Programmering" Discord and NNUG. Pitch a JavaZone/NDC lightning
talk; a Bekk Christmas article in December.*

---

## 4) Demo script (≈4 min — for a talk, video, or asciinema)

**Hook (20s):** "Integrating a Norwegian public API from Node? Step one is always the same
tax: hand-roll the Maskinporten JWT dance. Watch me skip it entirely — with no credentials."

**The pain (30s):** show a typical hand-rolled `axios + jsonwebtoken` snippet; "every repo
re-writes this, and you can't test it without a real org cert."

**Mock-first (60s):**
```bash
npx maskinporten-mock              # local token endpoint on :6969, zero setup
```
```ts
import { createMaskinportenClient } from 'maskinporten';
const c = createMaskinportenClient({ env: 'test', clientId: 'demo', scope: 'x:y',
  key: myTestKey, tokenEndpoint: 'http://localhost:6969/token', audience: 'http://localhost:6969/' });
await c.getToken();                // cached, auto-renews — no Norwegian credentials
```
"That's a green integration test in CI with nothing to register."

**The wizard (45s):**
```bash
npx maskinporten-wizard            # pick a use-case → exact scopes + Altinn URNs + steps
```
Show the web version too (the live URL).

**Real thing (30s):** point the same client at `env: 'prod'`, `exchangeToAltinnToken()` in
one line; "when you *are* ready, the prerequisites doc lists exactly what to register."

**Close (20s):** "Java and .NET had this for years. Now Node does too — open source, free.
github.com/webmaxru/maskinporten. What should the mock simulate next?"

*asciinema plan:* record `mock` in one pane, a `tsx` REPL calling `getToken()` in another,
then the wizard. Export as GIF for the README hero + LinkedIn.

---

## 5) Directory / awesome-list entries (to PR)

**`punkpeye/awesome-mcp-servers`** (or a future `awesome-norwegian-apis`) — the mock is an
MCP-adjacent Norwegian dev tool; when an MCP surface is added, list it. Suggested line:

```markdown
- [maskinporten](https://github.com/webmaxru/maskinporten) — TypeScript client, a
  credential-free local mock, and a scope wizard for Norway's Maskinporten (Digdir/Altinn).
```

**`public-apis`-style Norway list** — cross-link from the planned `awesome-norwegian-apis`
(dev-edition idea #2) under an "Auth / Government" section.

---

## 6) Launch checklist

- [x] MIT license, public repo, README with quickstart
- [x] Live demos (wizard on SWA, mock on Container Apps — free tier)
- [x] CI green (build/typecheck/lint/22 tests)
- [ ] Record the demo GIF/asciinema (§4) → add to README hero
- [ ] Publish packages to npm (add a changeset, set `NPM_TOKEN`/OIDC, re-enable `release.yml`)
- [ ] Post: LinkedIn (§1) + X thread (§2)
- [ ] Tip kode24 (§3); share in Norsk Programmering Discord + NNUG
- [ ] PR the awesome-list entry (§5)
- [ ] (Optional) custom domains once Cloudflare DNS is set (see `infra/README.md`)
- [ ] Pitch a JavaZone / NDC lightning talk; Bekk Christmas article (December)
