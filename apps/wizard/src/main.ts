import './style.css';
import { decodeJwt, decodeProtectedHeader, generateKeyPair, SignJWT } from 'jose';
import { findUseCase, getCatalogue, type UseCase } from 'maskinporten-wizard';

const MOCK_URL =
  'https://maskinporten-mock.ambitiousflower-539d08fc.swedencentral.azurecontainerapps.io';

const byId = <T extends HTMLElement>(id: string): T | null => document.getElementById(id) as T | null;

/* -------------------------------------------------------------------------- */
/* small DOM helper (textContent-safe)                                         */
/* -------------------------------------------------------------------------- */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: { className?: string; text?: string; href?: string } = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text) node.textContent = options.text;
  if (options.href && node instanceof HTMLAnchorElement) {
    node.href = options.href;
    node.target = '_blank';
    node.rel = 'noreferrer';
  }
  return node;
}

function slab(title: string, body: HTMLElement, mono = false): HTMLElement {
  const box = el('div', { className: mono ? 'slab code' : 'slab' });
  box.append(el('h4', { text: title }), body);
  return box;
}

function list(items: string[]): HTMLUListElement {
  const ul = el('ul');
  for (const item of items) ul.append(el('li', { text: item }));
  return ul;
}

function linkList(items: string[]): HTMLUListElement {
  const ul = el('ul');
  for (const item of items) {
    const li = el('li');
    li.append(el('a', { text: item, href: item }));
    ul.append(li);
  }
  return ul;
}

/* -------------------------------------------------------------------------- */
/* scope wizard                                                                */
/* -------------------------------------------------------------------------- */

function renderUseCase(useCase: UseCase, target: HTMLElement): void {
  target.replaceChildren();
  target.append(
    el('h3', { className: 'usecase-title', text: useCase.title }),
    el('p', { className: 'muted', text: `Audience: ${useCase.audience ?? 'general'}` }),
    slab('Maskinporten scopes', list(useCase.scopes), true),
  );
  if (useCase.altinnResources?.length) {
    target.append(slab('Altinn resource URNs', list(useCase.altinnResources), true));
  }
  target.append(
    slab('Request access from', list(useCase.requestFrom)),
    slab('Registration steps', list(useCase.steps)),
    slab('Portals', linkList(useCase.portals)),
  );
  if (useCase.notes) {
    target.append(slab('Notes', el('p', { className: 'muted', text: useCase.notes })));
  }
}

function initWizard(): void {
  const select = byId<HTMLSelectElement>('wizard-select');
  const result = byId<HTMLDivElement>('wizard-result');
  if (!select || !result) return;

  const catalogue = getCatalogue();
  for (const useCase of catalogue.useCases) {
    const option = el('option', { text: useCase.title });
    option.value = useCase.id;
    select.append(option);
  }

  select.addEventListener('change', () => {
    const useCase = findUseCase(select.value);
    if (useCase) renderUseCase(useCase, result);
  });

  renderUseCase(catalogue.useCases[0], result);
}

/* -------------------------------------------------------------------------- */
/* in-browser token grant against the live mock                                */
/* -------------------------------------------------------------------------- */

interface TokenResult {
  accessToken: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  expiresIn: number;
}

async function issueToken(): Promise<TokenResult> {
  const { privateKey } = await generateKeyPair('RS256', { extractable: true });
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: 'demo:scope' })
    .setProtectedHeader({ alg: 'RS256', kid: 'browser-demo' })
    .setIssuer('playground-demo')
    .setAudience(`${MOCK_URL}/`)
    .setIssuedAt(now)
    .setExpirationTime(now + 100)
    .setJti(crypto.randomUUID())
    .sign(privateKey);

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  const response = await fetch(`${MOCK_URL}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) {
    throw new Error(`Mock returned HTTP ${response.status}: ${await response.text()}`);
  }
  const json = (await response.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: json.access_token,
    header: decodeProtectedHeader(json.access_token) as Record<string, unknown>,
    payload: decodeJwt(json.access_token) as Record<string, unknown>,
    expiresIn: json.expires_in,
  };
}

/* -------------------------------------------------------------------------- */
/* hero pass                                                                   */
/* -------------------------------------------------------------------------- */

function initHeroPass(): void {
  const button = byId<HTMLButtonElement>('issue-pass');
  const passCard = byId<HTMLDivElement>('hero-pass');
  const body = byId<HTMLDivElement>('pass-body');
  if (!button || !passCard || !body) return;

  button.addEventListener('click', () => {
    void (async () => {
      button.disabled = true;
      body.textContent = 'Signing a grant and requesting a token…';
      try {
        const { payload, header, accessToken } = await issueToken();
        const exp = typeof payload.exp === 'number' ? new Date(payload.exp * 1000) : undefined;
        body.replaceChildren();
        const lines: Array<[string, string]> = [
          ['sub', String(payload.sub ?? '—')],
          ['scope', String(payload.scope ?? '—')],
          ['alg', String(header.alg ?? '—')],
          ['expires', exp ? exp.toLocaleTimeString() : '—'],
        ];
        for (const [key, value] of lines) {
          const row = el('div');
          row.append(el('span', { className: 'k', text: `${key.padEnd(8)} ` }), document.createTextNode(value));
          body.append(row);
        }
        const token = el('div', { className: 'dim', text: `\n${accessToken.slice(0, 44)}…` });
        body.append(token);
        passCard.classList.add('stamped');
      } catch (error) {
        body.textContent =
          error instanceof Error ? error.message : 'Could not reach the mock. Try again shortly.';
      } finally {
        button.disabled = false;
      }
    })();
  });
}

/* -------------------------------------------------------------------------- */
/* mock playground                                                             */
/* -------------------------------------------------------------------------- */

function initPlayground(): void {
  const output = byId<HTMLPreElement>('pg-output');
  const status = byId<HTMLDivElement>('pg-status');
  const statusText = byId<HTMLSpanElement>('pg-status-text');
  const base = byId<HTMLParagraphElement>('pg-base');
  if (!output || !status || !statusText || !base) return;

  base.textContent = MOCK_URL;

  const setStatus = (ok: boolean, text: string): void => {
    status.hidden = false;
    status.className = `status ${ok ? 'ok' : 'err'}`;
    statusText.textContent = text;
  };

  const show = (value: unknown): void => {
    output.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  };

  const getJson = async (path: string, label: string): Promise<void> => {
    output.textContent = `GET ${path}\n…`;
    try {
      const response = await fetch(`${MOCK_URL}${path}`);
      const text = await response.text();
      setStatus(response.ok, `${label} — HTTP ${response.status}`);
      try {
        show(JSON.parse(text));
      } catch {
        show(text);
      }
    } catch (error) {
      setStatus(false, 'Request failed');
      show(error instanceof Error ? error.message : 'Network or CORS error.');
    }
  };

  const actions: Record<string, () => Promise<void>> = {
    discovery: () => getJson('/.well-known/oauth-authorization-server', 'Discovery'),
    jwks: () => getJson('/jwks', 'JWKS'),
    health: () => getJson('/health', 'Health'),
    async token() {
      output.textContent = 'Signing a grant in your browser and POSTing /token…';
      try {
        const result = await issueToken();
        setStatus(true, `Token issued — HTTP 200 · expires in ${result.expiresIn}s`);
        show({ header: result.header, payload: result.payload, access_token: `${result.accessToken.slice(0, 48)}…` });
      } catch (error) {
        setStatus(false, 'Token request failed');
        show(error instanceof Error ? error.message : 'Request failed.');
      }
    },
    async error() {
      output.textContent = 'POST /token?scenario=unknown-scope …';
      try {
        const body = new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: 'demo',
        });
        const response = await fetch(`${MOCK_URL}/token?scenario=unknown-scope`, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body,
        });
        const text = await response.text();
        setStatus(false, `Rejected as designed — HTTP ${response.status}`);
        try {
          show(JSON.parse(text));
        } catch {
          show(text);
        }
      } catch (error) {
        setStatus(false, 'Request failed');
        show(error instanceof Error ? error.message : 'Network or CORS error.');
      }
    },
  };

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-pg]')) {
    button.addEventListener('click', () => {
      const action = actions[button.dataset.pg ?? ''];
      if (action) void action();
    });
  }
}

/* -------------------------------------------------------------------------- */
/* code sample tabs                                                            */
/* -------------------------------------------------------------------------- */

function highlightComments(code: HTMLElement): void {
  const raw = code.textContent ?? '';
  code.replaceChildren();
  const lines = raw.split('\n');
  lines.forEach((line, index) => {
    if (line.trimStart().startsWith('//')) {
      code.append(el('span', { className: 'ct', text: line }));
    } else {
      code.append(document.createTextNode(line));
    }
    if (index < lines.length - 1) code.append(document.createTextNode('\n'));
  });
}

function initCodeTabs(): void {
  const tablist = document.querySelector<HTMLDivElement>('.code-tabs .tablist');
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.code-tabs .tab'));
  const panels = Array.from(document.querySelectorAll<HTMLPreElement>('.code-tabs .code-panel'));
  if (!tablist || tabs.length === 0 || tabs.length !== panels.length) return;

  for (const panel of panels) {
    const code = panel.querySelector('code');
    if (code) highlightComments(code);
    const raw = code?.textContent ?? '';
    const copy = el('button', { className: 'copy-btn', text: 'Copy' });
    copy.type = 'button';
    copy.setAttribute('aria-label', 'Copy code sample');
    copy.addEventListener('click', () => {
      void navigator.clipboard?.writeText(raw).then(() => {
        copy.textContent = 'Copied';
        copy.classList.add('copied');
        window.setTimeout(() => {
          copy.textContent = 'Copy';
          copy.classList.remove('copied');
        }, 1400);
      });
    });
    panel.append(copy);
  }

  const select = (index: number, focus = true): void => {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
    if (focus) tabs[index].focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i, false));
    tab.addEventListener('keydown', (event) => {
      const last = tabs.length - 1;
      let next: number | null = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = i === last ? 0 : i + 1;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = i === 0 ? last : i - 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = last;
      if (next !== null) {
        event.preventDefault();
        select(next);
      }
    });
  });
}

initWizard();
initHeroPass();
initPlayground();
initCodeTabs();
