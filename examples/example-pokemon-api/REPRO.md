# turbo hash churn on unrelated schema changes

Repro for a bug in `generateTurbo`: each `@gql.tada/hash` comment includes a
fingerprint of the **full** schema output file. A schema change that no
document can see still changes every hash, and `turbo` reuses no cached type.
See `repro.mjs`.

## Run it

Build `@gql.tada/cli-utils` first, because this example resolves it from the
workspace `dist`:

```sh
pnpm --filter @gql.tada/cli-utils build
node examples/example-pokemon-api/repro.mjs
```

The script:

1. Runs `generateOutput` and `generateTurbo`, and records each document hash.
2. Adds `unrelated: Int` to `type Query` in `schema.graphql`. No document in
   this project selects that field.
3. Runs `generateOutput` and `generateTurbo` again, and compares the hashes.
4. Restores `schema.graphql`, `graphql-env.d.ts` and `graphql-cache.d.ts`, so
   the run leaves no diff.

On `main` (`@gql.tada/cli-utils@1.9.4`), both hashes change, and the second
run reports `2 document types cached` with none reused. This includes the
`PokemonItem` fragment, which does not touch `Query` at all:

```
CHANGED    "\n  fragment PokemonItem on Pokemon {\n    id\n    name\n  
CHANGED    "\n  query Pokemons ($limit: Int = 10) {\n    pokemons(limit

2 of 2 document hashes changed after adding `Query.unrelated`.
BUG: no document selects that field.
```

The script exits with `1` when any hash changes and `0` when none change.

Here there are only 2 documents, so the cost is small. In a monorepo with one
shared schema and one turbo output file for each area, one schema update
rewrites the hash of every document in every file. This causes merge conflicts
and review requests for teams whose documents did not change.
