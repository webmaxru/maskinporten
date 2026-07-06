#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { intro, isCancel, note, outro, select } from '@clack/prompts';
import { findUseCase, formatUseCase, getCatalogue } from './index';

interface CliOptions {
  id?: string;
  json: boolean;
  help: boolean;
}

const usage = `Usage: maskinporten-wizard [--id <useCaseId>] [--json]

Without --id, an interactive selector is shown.
Use --json together with --id for machine-readable output.`;

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { json: false, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--id') {
      options.id = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--id=')) {
      options.id = arg.slice('--id='.length);
    }
  }

  return options;
}

export async function main(
  argv = process.argv.slice(2),
  write: (message: string) => void = console.log,
): Promise<number> {
  const options = parseArgs(argv);

  if (options.help) {
    write(usage);
    return 0;
  }

  if (options.id) {
    const useCase = findUseCase(options.id);

    if (!useCase) {
      write(`Unknown use-case "${options.id}".`);
      return 1;
    }

    write(options.json ? JSON.stringify(useCase, null, 2) : formatUseCase(useCase));
    return 0;
  }

  if (options.json) {
    write(JSON.stringify(getCatalogue(), null, 2));
    return 0;
  }

  const catalogue = getCatalogue();

  intro('Maskinporten scope wizard');
  const selected = await select({
    message: 'What are you integrating with?',
    options: catalogue.useCases.map((useCase) => ({
      label: useCase.title,
      value: useCase.id,
      hint: useCase.audience,
    })),
  });

  if (isCancel(selected)) {
    outro('Cancelled.');
    return 1;
  }

  const useCase = findUseCase(selected as string);

  if (!useCase) {
    outro('Selected use-case was not found.');
    return 1;
  }

  note(formatUseCase(useCase), 'Checklist');
  outro('Use the listed scopes/resources when registering your Maskinporten client.');
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = await main();
}
