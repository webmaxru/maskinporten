import { catalogue } from './catalogue.generated';

export interface UseCase {
  id: string;
  title: string;
  /** e.g. "own-company" | "system-provider" */
  audience?: string;
  /** Maskinporten scopes to request. */
  scopes: string[];
  /** Altinn resource URNs needed for systembruker rights. */
  altinnResources?: string[];
  /** Which authority authorizes the scopes. */
  requestFrom: string[];
  /** Ordered registration checklist. */
  steps: string[];
  /** Relevant portal / doc links. */
  portals: string[];
  notes?: string;
}

export interface Catalogue {
  version: number;
  useCases: UseCase[];
}

export function getCatalogue(): Catalogue {
  return catalogue;
}

export function findUseCase(id: string): UseCase | undefined {
  return catalogue.useCases.find((useCase) => useCase.id === id);
}

export function formatUseCase(useCase: UseCase): string {
  const lines = [
    `${useCase.title} (${useCase.id})`,
    useCase.audience ? `Audience: ${useCase.audience}` : undefined,
    '',
    'Scopes:',
    ...useCase.scopes.map((scope) => `  - ${scope}`),
  ];

  if (useCase.altinnResources?.length) {
    lines.push('', 'Altinn resources:', ...useCase.altinnResources.map((urn) => `  - ${urn}`));
  }

  lines.push('', 'Request access from:', ...useCase.requestFrom.map((authority) => `  - ${authority}`));
  lines.push('', 'Registration steps:', ...useCase.steps.map((step, index) => `  ${index + 1}. ${step}`));
  lines.push('', 'Portals:', ...useCase.portals.map((portal) => `  - ${portal}`));

  if (useCase.notes) {
    lines.push('', 'Notes:', useCase.notes);
  }

  return lines.filter((line): line is string => line !== undefined).join('\n');
}
