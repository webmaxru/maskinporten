import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(packageRoot, 'data', 'catalogue.yaml');
const outputPath = resolve(packageRoot, 'src', 'catalogue.generated.ts');

const catalogue = YAML.parse(readFileSync(sourcePath, 'utf8')) as unknown;
const json = JSON.stringify(catalogue, null, 2);

writeFileSync(
  outputPath,
  `import type { Catalogue } from './index';\n\nexport const catalogue: Catalogue = ${json};\n`,
);

console.log(`Generated ${outputPath}`);
