# cwd-dependent scan bug

Repro for a bug in `generateTurbo`/`generateOutput`: their internal
`createExternalFiles()` scan resolves one directory (`"."`) against the
*calling process's* `cwd`, not this project's directory. See `repro.mjs`.

## Run it

Compare the same call from two different working directories. Both invocations
point `--tsconfig` at this project's absolute path, so only `process.cwd()`
differs between them:

```sh
# Correct: cwd is this project's own directory.
cd examples/example-pokemon-api
node repro.mjs

# Buggy: cwd is `examples/`, standing in for a much larger monorepo root.
# (examples/ already mirrors monorepo anyway)
cd ..
node example-pokemon-api/repro.mjs
```

The first run reports its real document count and no warnings. The second
run reports warnings about files inside `example-pokemon-svelte/` and
`example-pokemon-vue/`, projects that have nothing to do with this project's
tsconfig. That is `createExternalFiles()` resolving its `"."` scan directory
against `examples/` (this run's cwd) instead of `example-pokemon-api/`, and
walking every sibling project it finds there.

Here `examples/` is small, so the extra scan only costs low milliseconds, but
this value increases with the size and complexity of the repo.
