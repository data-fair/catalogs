import type { Ref, MaybeRefOrGetter } from 'vue'
import { useAgentState, useAgentTool } from '@data-fair/lib-vue-agents'

export const useAgentPage = (opts: {
  key: string
  state: () => object | null | undefined
  activeTab: Ref<string>
  tabs: MaybeRefOrGetter<{ key: string, title: string }[]>
  save?: { unsaved: () => boolean, label: () => string }
}) => {
  const session = useSession()

  useAgentState(opts.key, () => {
    const state = opts.state()
    if (!state) return null
    return {
      ...state,
      openTab: opts.activeTab.value,
      tabs: toValue(opts.tabs).map(tab => `${tab.key} (${tab.title})`),
      ...(opts.save && {
        unsavedChanges: opts.save.unsaved(),
        save: `Changes made in the configuration form are applied when the person clicks "${opts.save.label()}"; there is no tool for it.`
      })
    }
  })

  useAgentTool({
    name: 'open_page_tab',
    description: `Open a tab of the current ${opts.key} page. The tools of a form only exist while its tab is open.`,
    annotations: { title: session.lang.value === 'fr' ? 'Ouvrir un onglet' : 'Open a tab', readOnlyHint: true },
    inputSchema: {
      type: 'object' as const,
      properties: { tab: { type: 'string' as const, description: 'The tab key, as listed in the page state' } },
      required: ['tab'] as const
    },
    execute: async ({ tab }) => {
      const target = toValue(opts.tabs).find(t => t.key === tab)
      if (!target) return { content: [{ type: 'text' as const, text: `Unknown tab "${tab}".` }], isError: true }
      opts.activeTab.value = target.key
      return `Tab "${target.title}" is open.`
    }
  })
}
