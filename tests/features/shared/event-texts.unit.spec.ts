import { test, expect } from '@playwright/test'
import { eventText, messages } from '../../../shared/event-texts.ts'

test.describe('event texts', () => {
  test('every language has the same keys and placeholders', () => {
    const placeholders = (message: string) => [...message.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort()
    for (const [key, message] of Object.entries(messages.fr)) {
      expect(placeholders(messages.en[key as keyof typeof messages.en]), key).toEqual(placeholders(message))
    }
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.fr).sort())
  })

  test('builds an internationalized title', () => {
    expect(eventText('import-error', { title: 'Stations' })).toEqual({
      fr: "L'import de la ressource Stations a échoué",
      en: 'The import of the resource Stations failed'
    })
  })

  test('keeps a placeholder without value', () => {
    expect(eventText('catalog-create', {}).en).toBe('The catalog {title} was created')
  })
})
