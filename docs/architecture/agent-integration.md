# AI assistant integration

The catalogs UI runs inside the data-fair back-office (a d-frame). data-fair renders the chat
drawer of the `agents` service; catalogs only exposes **WebMCP tools** and **host state** to it,
through `@data-fair/lib-vue-agents`. Nothing here talks to an LLM, and no tool runs server side.

- `ui/src/App.vue` calls `useFrameServer('catalogs')` once: every tool registered on
  `navigator.modelContext` afterwards reaches the chat over the tab's BroadcastChannel.
- Tools live with the component that owns the state they act on and are unregistered when it
  unmounts (`useAgentTool` disposes with the effect scope), so the tool set follows the page.
- Creating, saving and deleting stay clicks of the person: tools fill forms and move through
  wizards, the state they publish says which button finishes the job.

## Tools

| Where | Tools |
|---|---|
| every vjsf form (`@koumoul/vjsf/webmcp`) | `<prefix>describeState`, `setFieldValue`, `setData`, `editArray`, `getFieldSuggestions`, `getData`, plus the `<prefix>form` sub-agent. Prefixes: `catalogConfig_` (creation and configuration tab), `importConfig_` (import wizard and import page), `publicationConfig_` (publication wizard), `resourceFilters_` (explorer filters, no sub-agent) |
| `components/resources-explorer.vue` | `browse_remote_resources`, `select_remote_resource` (not in folder-selection modes, where the open folder is the selection) |
| `pages/catalogs/new.vue` | `list_catalog_plugins`, `select_catalog_plugin` |
| the three wizards (`composables/use-agent-wizard.ts`) | `wizard_go_to_step`, refuses the steps the person could not open either |
| the catalog, import and publication pages (`composables/use-agent-page.ts`) | `open_page_tab`, since a form's tools only exist while its tab is open |
| the catalog page | `open_catalog_wizard` (import or publication) |

A tool that mounts a form (a tab, a wizard step, a catalog type) returns only once the page's
tool list has settled (`untilToolsSettle` in `utils/agent-state.ts`): the chat refreshes its tools
between two requests of a turn, so the form tools are callable from the assistant's next step.

Listing and describing catalogs from anywhere in the back-office is data-fair's job
(`list_catalogs`, `describe_catalog` in data-fair's `connector-tools.ts`).

## Host state

`useAgentState` keys, last value wins: `wizard` (current step, available steps, guidance, the
submit button), `catalog`, `import`, `publication` (what the page shows, the open tab, the button that saves;
runs carry their last errors and messages, built by `utils/agent-state.ts`). There is no
"unsaved changes" flag: vjsf fills the plugin's defaults when a form opens, so the page reads
as modified before anyone types. The
location is published by data-fair, whose route follows the frame.

## Simulations

`simulations/` holds judged browser simulations, run by the `/agents-sim` skill (see AGENTS.md):
the persona logs in as `test_admin1` of `test_org1`, lands on a back-office route
(`/data-fair/catalogs/...`) and talks to the chat of the shell; the tools it reaches are the
ones above. Cases seed one catalog connected to the mock plugin (`runner/fixtures.ts`).
The loop, the gateway error capture and the bridge settings are adapted from portals.

## Tests

`tests/features/ui/agent-tools.e2e.spec.ts` drives the tools through `navigator.modelContext`
without a chat; `tests/features/ui/agent-state.unit.spec.ts` covers the text builders.
