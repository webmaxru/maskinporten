# The Machine Gate

### How a "failed" consumer app turned into Maskinporten Tools — and what building it (mostly with AI agents) taught me about developer experience

I set out to build a viral little web app for Norwegians. I ended up building developer
infrastructure instead. The moment I understood *why that swap happened* is the most
useful thing I can hand you — so let me tell it as it actually went, bugs and reversals
included.

---

## A rite of passage nobody enjoys

If you've ever integrated a Norwegian public-sector API — Folkeregisteret, Skatteetaten,
Altinn, KRR, Elhub — you've met **Maskinporten**. It's the OAuth2 machine-to-machine gate
in front of roughly fifty of them. The name translates, almost too perfectly, to *"the
machine gate."*

Getting through that gate is a rite of passage. You build a JWT grant with *exactly* the
right claims — `aud`, `iss`, `scope`, `iat`, an `exp` no more than ~120 seconds out, a
`jti` — and one extra claim gets you a flat `invalid assertion`. You sign it, you exchange
it at the token endpoint, and then, for most Altinn APIs, you exchange it *again* for an
Altinn token that arrives as a quoted string you have to unwrap. Somewhere in that chain
you'll meet `AUTH-00004`, a catch-all error that means "something, somewhere, is wrong" —
wrong environment, an ungranted scope, an unapproved system user, a stale token — and
tells you nothing about which.

Java and .NET developers have good libraries for all this. If you work in Node.js or
TypeScript, you don't. So every team re-writes the same ~110 lines of `axios` +
`jsonwebtoken` glue, and "just write an integration test" means wrangling a real
organisation certificate against a test environment before you've written a line of your
actual feature.

That's the status quo: a tax you pay before you build anything.

## The reversal

Here's the part I got wrong first. I'd been researching Norway's open APIs to find a
*consumer* app idea — something viral for the general public. I shipped a few. Then a
fellow developer's side project detonated in the Norwegian dev community: it wrapped a
pile of public data sources as tools an AI agent could call, keyless, and the response was
enormous.

I'd optimized for the wrong audience. The love in a *developer* community doesn't go to
one more consumer app — it goes to **leverage**: the thing other developers can build on.
And the richest, most painful, most valuable slice — the Maskinporten-gated tier — was
exactly the one everyone's tooling politely avoided, because it needs credentials.

So I changed targets. Not another app. A toolkit for the gate itself.

## The one decision that mattered: mock-first

Every good developer tool has a single decision that makes everything downstream easy.
For this one it was: **you must be able to build and test with zero credentials.**

That produced three pieces:

- **`maskinporten`** — the client. One call for a cached, auto-renewing token; Altinn
  exchange and `systembruker` built in.
- **`maskinporten-mock`** — a local mock of the token endpoint that speaks the real
  JWT-bearer protocol.
- **`maskinporten-wizard`** — a scope catalogue and CLI (more on it below).

The client is deliberately boring to use:

```ts
import { createMaskinportenClient } from 'maskinporten';

const client = createMaskinportenClient({
  env: 'test',
  clientId: process.env.MASKINPORTEN_CLIENT_ID!,
  scope: 'skatteetaten:formueinntekt/skattemelding',
  key: { pem: process.env.MASKINPORTEN_PRIVATE_KEY!, kid: process.env.MASKINPORTEN_KID! },
});

const token = await client.getToken();          // cached + auto-renewed
const altinn = await client.exchangeToAltinnToken();
```

And here's the payoff of mock-first — the thing that makes contributors and CI happy:

```bash
npx maskinporten-mock          # a local Maskinporten on :6969, no credentials
```

Point the client's `tokenEndpoint` at it and your integration tests run offline, in
milliseconds, with nothing to register. The whole repo builds and its 31 tests pass
without a single Norwegian secret. Onboarding a contributor went from "first, acquire a
business certificate" to `git clone && pnpm test`.

## Where it got interesting (a.k.a. the bugs)

No honest build story is a straight line. Three moments taught me more than the happy path.

**"Works on my machine" — the container edition.** The mock ran perfectly locally and
then answered every request in the cloud with a timeout. The cause was one line: the
server bound to `127.0.0.1`. On my laptop that's fine; inside an Azure Container App, the
ingress forwards traffic to the container's real interface, and nothing was listening
there. Bind to `0.0.0.0`, ship, done. A five-character fix behind an hour of confusion —
the most classic bug in the book, and it still got me.

**The command that couldn't find itself.** I proudly told people to run
`npx maskinporten-wizard`. It didn't work. `npx` resolves a command to a package *of the
same name* — but the binary lived inside a package called `maskinporten-scopes`, which
wasn't published yet either. The advertised command was a fiction. I renamed the package
to match the command. Lesson: your install instructions are part of the product; test
them like code.

**The critique that reshaped the product.** At one point I looked at the scope wizard —
a nice interactive "which scopes do I need?" lookup — and asked the uncomfortable
question: *does this CLI add anything the web page doesn't?* Honestly, no. As a catalogue
viewer it was a second front-end for the same data.

A command line earns its place only by doing what a web page *can't* — touch your local
keys, and hit the real network. So the CLI grew up:

```bash
npx maskinporten-wizard init      # generate a keypair, .env, and a client snippet
npx maskinporten-wizard doctor    # attempt a REAL token request and decode the failure
```

`doctor` is the one I'm proud of. It performs the actual grant — against real Maskinporten
*or* your local mock — and turns the notorious `AUTH-00004` and its cousins into an
actionable checklist: wrong environment? scope not granted to this client? key/`kid` not
registered? system user unapproved? The web page could never do that. That reversal —
*stop showing data, start diagnosing failures* — is the single best product decision in
the project, and it only happened because I let a critique kill a feature I'd already
built.

## The website as a thesis

A toolkit needs a front door, so I gave it one — and refused to let it look like every
other dark-mode dev landing page. The subject *is* a gate, so the site became **passport
control for machines**: deep ink, a **brass "official stamp"** accent instead of the usual
acid-green, Space Grotesk over IBM Plex Mono for the "machine" voice.

The signature is interactive. On the hero, you press **Issue a pass** and the page
generates a keypair, signs a grant *in your browser*, calls the live mock, and stamps the
returned token onto a boarding-pass-style card. A real token, no backend, no credentials —
the project's whole thesis in one gesture. There's a full **playground** below it that
pokes the live mock's discovery, JWKS, and error paths. Making the browser talk to the
hosted mock meant adding CORS to the mock — a small change with a big "oh, now I can
actually try it" effect.

I also made the site legible to the *other* audience that matters now: crawlers and AI
agents. Full Open Graph and Twitter cards, JSON-LD, a web manifest, a sitemap, a
`robots.txt` that explicitly welcomes the major agent crawlers, and an `llms.txt` so an LLM
can understand the project from one file. All the descriptive content lives in the static
HTML, so an agent that doesn't run JavaScript still gets the whole story.

## Built by a fleet

Here's the part that's a little uncanny: most of this was built by a **fleet of AI
agents**, working in parallel, with me as director and critic rather than typist. One
agent owned the client and the mock; another the catalogue and wizard; another the docs.
I reviewed, integrated, and — crucially — pushed back. "Does the CLI add value?" wasn't a
prompt to a compiler; it was the kind of taste-level question that still has to come from a
human. The agents were extraordinary at execution and needed me for judgment. That
division of labour is, I think, what "AI-native development" actually looks like day to
day.

## Free, and live

The economics matter for an open-source side project: it costs me nothing to run. The
site is on **Azure Static Web Apps** (free tier); the mock demo is on **Azure Container
Apps** on a consumption plan that **scales to zero**, so an idle mock costs €0. The image
lives in public GHCR, infra is a small Bicep file, and every push to `main` redeploys via
GitHub Actions. It lives at **[maskinporten.isainative.dev](https://maskinporten.isainative.dev)**.

## What I'd pass on

Three takeaways, in order of how much I believe them:

1. **Aim your effort at leverage, not applause.** For a developer audience, the highest-value
   thing you can build is the tool the *next* developer builds on — especially in the
   painful, credential-gated corners everyone else avoids.
2. **Pick the one decision that makes everything else easy.** Here it was mock-first:
   zero-credential development turned a bureaucratic cliff into `pnpm test`.
3. **Let critique kill your darlings.** The best feature in the project (`doctor`) exists
   because I was willing to admit the feature I'd already shipped (a prettier catalogue)
   didn't earn its place.

If you write Norwegian public-sector integrations from Node or TypeScript, try it:
`npm i maskinporten`, `npx maskinporten-mock`, and — when the gate won't open —
`npx maskinporten-wizard doctor`. It's MIT, it's on
**[GitHub](https://github.com/webmaxru/maskinporten)**, and I'd genuinely love your issues
and PRs.

The machine gate is still there. It's just a lot easier to walk through now.

---

*Maskinporten Tools is an independent open-source project — not affiliated with Digdir. The
hosted mock issues fake tokens for testing only.*
