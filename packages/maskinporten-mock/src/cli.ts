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

// Bind 0.0.0.0 by default so the server is reachable inside a container (e.g. Azure
// Container Apps ingress); override with HOST. Tests call startMockServer() directly
// and default to loopback.
const host = process.env.HOST ?? '0.0.0.0';
const server = await startMockServer({ port: parsePort(process.argv.slice(2)), host });
console.log(`maskinporten-mock listening on ${host}:${server.port}`);

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
