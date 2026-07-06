import { findUseCase, getCatalogue, type UseCase } from 'maskinporten-wizard';

const catalogue = getCatalogue();
const app = globalThis.document.querySelector<HTMLDivElement>('#app');

function el<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options: { className?: string; text?: string; href?: string } = {},
): HTMLElementTagNameMap[K] {
  const element = globalThis.document.createElement(tagName);

  if (options.className) {
    element.className = options.className;
  }

  if (options.text) {
    element.textContent = options.text;
  }

  if (options.href && element instanceof globalThis.HTMLAnchorElement) {
    element.href = options.href;
    element.target = '_blank';
    element.rel = 'noreferrer';
  }

  return element;
}

function renderList(items: string[], className?: string): HTMLUListElement {
  const list = el('ul', { className });

  for (const item of items) {
    list.append(el('li', { text: item }));
  }

  return list;
}

function renderLinks(links: string[]): HTMLUListElement {
  const list = el('ul');

  for (const link of links) {
    const item = el('li');
    item.append(el('a', { text: link, href: link }));
    list.append(item);
  }

  return list;
}

function renderSection(title: string, content: HTMLElement): HTMLElement {
  const section = el('section', { className: 'panel' });
  section.append(el('h2', { text: title }), content);
  return section;
}

function renderUseCase(useCase: UseCase, target: HTMLElement): void {
  target.replaceChildren();
  target.append(
    el('h2', { className: 'use-case-title', text: useCase.title }),
    el('p', { className: 'audience', text: `Audience: ${useCase.audience ?? 'general'}` }),
    renderSection('Maskinporten scopes', renderList(useCase.scopes, 'code-list')),
  );

  if (useCase.altinnResources?.length) {
    target.append(renderSection('Altinn resource URNs', renderList(useCase.altinnResources, 'code-list')));
  }

  target.append(
    renderSection('Request access from', renderList(useCase.requestFrom)),
    renderSection('Registration steps', renderList(useCase.steps)),
    renderSection('Portals', renderLinks(useCase.portals)),
  );

  if (useCase.notes) {
    target.append(renderSection('Notes', el('p', { text: useCase.notes })));
  }
}

function render(): void {
  if (!app) {
    return;
  }

  const style = el('style', {
    text: `
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      body { margin: 0; background: radial-gradient(circle at top, #1f3b55 0, #07111f 42rem); color: #eef7ff; }
      main { width: min(62rem, calc(100% - 2rem)); margin: 0 auto; padding: 4rem 0; }
      h1 { margin: 0 0 0.75rem; font-size: clamp(2.25rem, 6vw, 4.5rem); letter-spacing: -0.05em; }
      h2 { margin: 0 0 0.75rem; font-size: 1rem; color: #9fddff; text-transform: uppercase; letter-spacing: 0.08em; }
      p { line-height: 1.6; color: #c5d7e8; }
      label { display: block; margin: 2rem 0 0.5rem; font-weight: 700; }
      select { width: 100%; border: 1px solid #38566f; border-radius: 0.9rem; background: #102033; color: #fff; padding: 0.9rem 1rem; font: inherit; }
      a { color: #72d5ff; }
      .lede { max-width: 44rem; }
      .result { display: grid; gap: 1rem; margin-top: 1.5rem; }
      .panel { border: 1px solid rgba(145, 205, 255, 0.18); border-radius: 1rem; background: rgba(7, 17, 31, 0.72); padding: 1rem; box-shadow: 0 1rem 4rem rgba(0, 0, 0, 0.24); }
      .use-case-title { color: #fff; font-size: 1.6rem; text-transform: none; letter-spacing: -0.02em; }
      .audience { margin-top: -0.25rem; }
      ul { margin: 0; padding-left: 1.25rem; }
      li { margin: 0.45rem 0; line-height: 1.5; }
      .code-list li { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #d7f7ff; overflow-wrap: anywhere; }
    `,
  });
  const main = el('main');
  const selectElement = el('select');
  const result = el('div', { className: 'result' });

  for (const useCase of catalogue.useCases) {
    const option = el('option', { text: useCase.title });
    option.value = useCase.id;
    selectElement.append(option);
  }

  selectElement.addEventListener('change', () => {
    const useCase = findUseCase(selectElement.value);

    if (useCase) {
      renderUseCase(useCase, result);
    }
  });

  main.append(
    el('h1', { text: 'Maskinporten scope wizard' }),
    el('p', {
      className: 'lede',
      text: 'Choose an integration goal to see the scopes, Altinn resources, authorities, portals, and registration steps to prepare before coding.',
    }),
    el('label', { text: 'Use-case' }),
    selectElement,
    result,
  );

  app.replaceChildren(style, main);
  renderUseCase(catalogue.useCases[0], result);
}

render();
