#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { intro, isCancel, note, outro, select } from '@clack/prompts';
import { findUseCase, formatUseCase, getCatalogue } from './index';
import { runInit } from './init';
import { runDoctor } from './doctor';

const usage = `maskinporten-wizard — helper for Norway's Maskinporten

Usage:
  maskinporten-wizard [scopes] [--id <useCaseId>] [--json]   Look up scopes/resources for a use-case
  maskinporten-wizard init [--use-case <id>] [--out <dir>]   Generate a keypair, .env, and a client snippet
  maskinporten-wizard doctor [options]                       Try a real token request and diagnose failures

doctor options (or MASKINPORTEN_* env vars):
  --env <test|prod>  --client-id <id>  --scope <scope>  --kid <kid>
  --key <path-to-pem>  --token-endpoint <url>  --audience <url>  --system-user-org <0192:orgno>

With no command, an interactive scope lookup is shown.`;

interface Flags {
  positional: string[];
  bools: Set<string>;
  values: Map<string, string>;
}

function parseFlags(argv: string[]): Flags {
  const bools = new Set<string>();
  const values = new Map<string, string>();
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json' || arg === '--help' || arg === '-h') {
      bools.add(arg);
    } else if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        values.set(arg.slice(2, eq), arg.slice(eq + 1));
      } else if (index + 1 < argv.length && !argv[index + 1].startsWith('--')) {
        values.set(arg.slice(2), argv[index + 1]);
        index += 1;
      } else {
        bools.add(arg);
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, bools, values };
}

async function runScopes(flags: Flags, write: (message: string) => void): Promise<number> {
  const id = flags.values.get('id');
  const json = flags.bools.has('--json');

  if (id) {
    const useCase = findUseCase(id);
    if (!useCase) {
      write(`Unknown use-case "${id}".`);
      return 1;
    }
    write(json ? JSON.stringify(useCase, null, 2) : formatUseCase(useCase));
    return 0;
  }

  if (json) {
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

export async function main(
  argv = process.argv.slice(2),
  write: (message: string) => void = console.log,
): Promise<number> {
  const commands = new Set(['scopes', 'init', 'doctor']);
  const hasCommand = argv[0] !== undefined && commands.has(argv[0]);
  const command = hasCommand ? argv[0] : 'scopes';
  const flags = parseFlags(hasCommand ? argv.slice(1) : argv);

  if (flags.bools.has('--help') || flags.bools.has('-h')) {
    write(usage);
    return 0;
  }

  if (command === 'init') {
    return runInit(
      {
        useCaseId: flags.values.get('use-case') ?? flags.values.get('id'),
        outDir: flags.values.get('out'),
      },
      write,
    );
  }

  if (command === 'doctor') {
    return runDoctor(
      {
        env: flags.values.get('env') === 'prod' ? 'prod' : 'test',
        clientId: flags.values.get('client-id'),
        scope: flags.values.get('scope'),
        kid: flags.values.get('kid'),
        keyPath: flags.values.get('key'),
        tokenEndpoint: flags.values.get('token-endpoint'),
        audience: flags.values.get('audience'),
        systemUserOrg: flags.values.get('system-user-org'),
      },
      write,
    );
  }

  return runScopes(flags, write);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = await main();
}
