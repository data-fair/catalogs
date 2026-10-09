import type { Ref, MaybeRefOrGetter } from 'vue'
import { useAgentState, useAgentTool } from '@data-fair/lib-vue-agents'

export interface AgentWizardStep<S extends string = string> {
  value: S
  title: string
  enabled: boolean
  guidance: string
}

export const useAgentWizard = <S extends string>(opts: {
  name: string
  step: Ref<S>
  steps: MaybeRefOrGetter<AgentWizardStep<S>[]>
  submitLabel: MaybeRefOrGetter<string>
}) => {
  const session = useSession()

  useAgentState('wizard', () => ({
    wizard: opts.name,
    currentStep: opts.step.value,
    steps: toValue(opts.steps).map(s => ({ step: s.value, title: s.title, available: s.enabled, guidance: s.guidance })),
    submit: `The person creates it by clicking "${toValue(opts.submitLabel)}" on the last step; there is no tool for it.`
  }))

  useAgentTool({
    name: 'wizard_go_to_step',
    description: `Open a step of the "${opts.name}" wizard on the current page. Only the steps the wizard state marks as available can be opened.`,
    annotations: { title: session.lang.value === 'fr' ? "Changer d'étape" : 'Change step', readOnlyHint: false },
    inputSchema: {
      type: 'object' as const,
      properties: { step: { type: 'string' as const, description: 'The step value, as given in the wizard state' } },
      required: ['step'] as const
    },
    execute: async ({ step }) => {
      const target = toValue(opts.steps).find(s => s.value === step)
      if (!target) return { content: [{ type: 'text' as const, text: `Unknown step "${step}".` }], isError: true }
      if (!target.enabled) return { content: [{ type: 'text' as const, text: `Step "${target.title}" is not available yet: ${target.guidance}` }], isError: true }
      opts.step.value = target.value
      return `Step "${target.title}" is open. ${target.guidance}`
    }
  })
}
