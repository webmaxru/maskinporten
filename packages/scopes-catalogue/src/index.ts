/**
 * maskinporten-scopes — data + types for the Maskinporten scope/resource catalogue.
 *
 * SCAFFOLD: types below are the target schema. A loader that reads data/catalogue.yaml
 * and the interactive selection logic are tracked in plan.md (todo: scope-catalogue).
 */

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
  requestFrom?: string[];
  /** Ordered registration checklist. */
  steps?: string[];
  /** Relevant portal / doc links. */
  portals?: string[];
  notes?: string;
}

export interface Catalogue {
  version: number;
  useCases: UseCase[];
}

export const version = '0.0.0';
