#!/usr/bin/env node
import { startMockServer } from './server';

const parsePort = (args: string[], envPort = process.env.PORT): number => {
  const index = args.indexOf('--port');
  const portInput = index === -1 ? envPort : args[index + 1];
  if (!portInput) {
    return 6969;
  }

  const value = Number(portInput);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('Port must be a positive integer.');
  }
  return value;
};

const server = await startMockServer({ port: parsePort(process.argv.slice(2)) });
console.log(`maskinporten-mock listening at ${server.url}`);

const close = async (): Promise<void> => {
  await server.close();
  process.exit(0);
};

process.on('SIGINT', () => {
  void close();
});
process.on('SIGTERM', () => {
  void close();
});
