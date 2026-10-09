# AI assistant simulations — status

Judged runs of `simulations/cases/index.ts` (see the `/agents-sim` skill). Only valid, judged
runs fill the table.

## Baseline of 2026-10-09

Measured with the `agents` image `75bc260`, the `data-fair` image `f0d5497`,
`@data-fair/lib-agents-sim` 0.10.0, `@data-fair/lib-vue-agents` 0.6.1,
`@data-fair/lib-vuetify-agents` 0.6.4, `@koumoul/vjsf` 4.7.0, `catalog-mock` 0.6.1.
Tools role on haiku, persona on sonnet.

| Case | Pass A (assistant sonnet) | Pass B (assistant haiku) |
|---|---|---|
| `catalogue-creation` | satisfied | satisfied |
| `catalogue-configuration` | satisfied | satisfied |
| `import-ressource` | not satisfied: every import failed with a 421 from data-fair (dev environment) | not satisfied: the persona wanted every row, capped at 50 by the mock; then stuck on a blank frame after a guessed route |
| `import-diagnostic` | satisfied | not satisfied: correct diagnosis, then the frame could not leave the import page |

## What the runs made us fix

Earlier runs of the day, then this baseline:

- tools that mount a form wait for the page's tool list to settle, so its form tools are
  callable from the assistant's next step;
- the person's actions emit transitions (`wizard-step-opened`, `catalog-created`,
  `catalog-saved`, `import-created`, `import-saved`, `publication-created`): a
  `wait_for_user_action` never ends on keyed state;
- `open_catalog_wizard`, `list_catalog_items`, `open_catalog_item` and `search_remote_catalog`;
- the catalogs list page publishes its state; the import state says when no dataset exists,
  how many scheduled rules there are, how to rerun and where its form is;
- no `unsavedChanges` flag in the host state;
- the dev worker calls data-fair on its own port (data-fair now answers 421 to proxied calls of
  internal endpoints) with an API key that has `asAccount`;
- the runner marks runs broken by the Vite dev server invalid.

## Open

- Opening a configuration tab fills the plugin's defaults (intended: saving stores them), so
  leaving the page asks for confirmation. The test browser dismissed it and blocked every
  navigation in the import diagnosis on haiku; the runner now accepts dialogs and records them
  in the console errors the judge reads.
- data-fair's `navigate` reports success when the catalogs frame does not move.
- The catalogs `*-ui-config.js` request answers a 404 page through the dev nginx.
- json-layout's form sub-agent has no title, the chat shows « CatalogConfig Form ».
