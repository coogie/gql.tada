/* eslint-disable no-console */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateTurbo } from '@gql.tada/cli-utils';

const here = dirname(fileURLToPath(import.meta.url));
const tsconfig = join(here, 'tsconfig.json');
const output = join(here, 'graphql-cache.repro.d.ts');

console.log(`process.cwd(): ${process.cwd()}`);
console.log(`--tsconfig:    ${tsconfig}`);

const start = Date.now();
await generateTurbo({ tsconfig, output, failOnWarn: false });
console.log(`generateTurbo() took ${Date.now() - start}ms`);
