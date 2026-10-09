/* eslint-disable no-console */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { generateOutput, generateTurbo } from '@gql.tada/cli-utils';

const here = dirname(fileURLToPath(import.meta.url));
const tsconfig = join(here, 'tsconfig.json');
const schemaFile = join(here, 'schema.graphql');
const outputFile = join(here, 'src/graphql-env.d.ts');
const turboFile = join(here, 'src/components/graphql-cache.d.ts');

// A field that no document in this project selects.
const UNRELATED_FIELD = '  unrelated: Int\n';
const QUERY_END = '  pokemons(limit: Int, skip: Int): [Pokemon]\n}';

/** Maps each cached document key to the hash in its `@gql.tada/hash` comment. */
async function readHashes() {
  const lines = (await readFile(turboFile, 'utf8')).split('\n');
  const hashes = new Map();
  for (let i = 0; i < lines.length - 1; i++) {
    const match = /@gql\.tada\/hash\s+([^\s*]+)/.exec(lines[i]);
    if (match) hashes.set(lines[i + 1].trim(), match[1]);
  }
  return hashes;
}

async function regenerate() {
  await generateOutput({ tsconfig, output: undefined, silent: true });
  await generateTurbo({ tsconfig, output: undefined, failOnWarn: false });
}

const originals = await Promise.all([schemaFile, outputFile, turboFile].map((f) => readFile(f)));

try {
  await regenerate();
  const before = await readHashes();

  const schema = originals[0].toString();
  if (!schema.includes(QUERY_END)) throw new Error('schema.graphql changed; update QUERY_END');
  await writeFile(schemaFile, schema.replace(QUERY_END, QUERY_END.replace('}', UNRELATED_FIELD + '}')));

  await regenerate();
  const after = await readHashes();

  let changed = 0;
  for (const [key, hash] of before) {
    const same = after.get(key) === hash;
    if (!same) changed++;
    console.log(`${same ? 'unchanged' : 'CHANGED  '}  ${key.slice(0, 60)}`);
  }
  console.log(`\n${changed} of ${before.size} document hashes changed after adding \`Query.unrelated\`.`);
  console.log(changed ? 'BUG: no document selects that field.' : 'OK: only affected documents change.');
  process.exitCode = changed ? 1 : 0;
} finally {
  // Restore the committed files so the repro leaves no diff behind.
  await Promise.all([schemaFile, outputFile, turboFile].map((f, i) => writeFile(f, originals[i])));
}
