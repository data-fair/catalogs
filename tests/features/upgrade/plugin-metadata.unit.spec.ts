import { test, expect } from '@playwright/test'
import { pluginTitle, pluginDescription } from '../../../upgrade/plugin-metadata.ts'

test.describe('pluginTitle', () => {
  test('replicates the single title string to fr and en', () => {
    expect(pluginTitle({ title: 'Catalog Mock' })).toEqual({ fr: 'Catalog Mock', en: 'Catalog Mock' })
  })

  test('returns undefined when no title is declared', () => {
    expect(pluginTitle({})).toBeUndefined()
  })
})

test.describe('pluginDescription', () => {
  test('uses the localized fr and en descriptions when both are present', () => {
    expect(pluginDescription({
      description: 'défaut',
      i18n: { fr: { description: 'desc fr' }, en: { description: 'desc en' } }
    })).toEqual({ fr: 'desc fr', en: 'desc en' })
  })

  test('falls back to the default description for fr when there is no fr localization', () => {
    expect(pluginDescription({ description: 'description par défaut' }))
      .toEqual({ fr: 'description par défaut' })
  })

  test('omits en — and never leaks the French default into it — when the plugin ships no English description', () => {
    const result = pluginDescription({ description: 'défaut', i18n: { fr: { description: 'desc fr' } } })
    expect(result).toEqual({ fr: 'desc fr' })
    expect(result).not.toHaveProperty('en')
  })

  test('uses the en localized description even without a default description', () => {
    expect(pluginDescription({ i18n: { en: { description: 'desc en' } } }))
      .toEqual({ en: 'desc en' })
  })

  test('returns undefined when no description is available anywhere', () => {
    expect(pluginDescription({})).toBeUndefined()
    expect(pluginDescription({ i18n: {} })).toBeUndefined()
  })
})
