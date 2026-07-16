import { test, expect } from '@playwright/test'
import { compile } from '@json-layout/core/compile'
import { StatefulLayout } from '@json-layout/core/state'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { resolvedSchema } from '../../../api/types/publication/.type/index.js'

// data-fair returns dataset.publicationSites as "<type>:<id>" keys, resolved against
// the publicationSites context built by the new-publication page
const publicationSites = {
  'data-fair-portals:a': { title: 'Portail A', url: 'https://a.test', datasetUrlTemplate: 'https://a.test/d/{id}' },
  'data-fair-portals:b': { title: 'Portail B', url: 'https://b.test', datasetUrlTemplate: 'https://b.test/d/{id}' }
}

const buildNode = async () => {
  // mirrors the schema the new-publication page feeds to vjsf
  const schema = jsonSchema(resolvedSchema).pickProperties(['dataFairDataset', 'publicationSite']).schema
  const compiled = compile(schema)
  const statefulLayout = new StatefulLayout(
    compiled,
    compiled.skeletonTrees[compiled.mainTree],
    {
      context: { origin: 'https://test.com', publicationSites },
      fetch: async () => ({ publicationSites: Object.keys(publicationSites) })
    },
    { dataFairDataset: { id: 'ds1', title: 'DS 1' } }
  )
  const node = statefulLayout.stateTree.root.children!.find((c: any) => c.key === 'publicationSite')
  const items = await statefulLayout.getItems(node)
  return { statefulLayout, node, items }
}

test.describe('publicationSite getItems', () => {
  test('gives each site a distinct scalar key', async () => {
    const { items } = await buildNode()
    const keys = items.map((i: any) => i.key)
    expect(keys).toEqual(['https://a.test', 'https://b.test'])
  })

  // vjsf re-derives the key from the *resolved value* rather than the raw item
  // (use-select-node.js valueComparator, use-get-items.js prepareSelectedItem), so the
  // key must survive that round-trip. Without it every item collapses to the same key
  // and vuetify treats them all as the current selection.
  test('derives the same key from a raw item and from its resolved value', async () => {
    const { statefulLayout, node, items } = await buildNode()
    for (const item of items) {
      expect(statefulLayout.prepareSelectItem(node, item.value).key).toBe(item.key)
    }
  })

  test('keeps two selected sites distinguishable', async () => {
    const { statefulLayout, node, items } = await buildNode()
    const keyOf = (site: any) => statefulLayout.prepareSelectItem(node, site).key
    expect(keyOf(items[0].value)).not.toBe(keyOf(items[1].value))
  })

  test('keeps the title readable once a site is selected', async () => {
    const { statefulLayout, node, items } = await buildNode()
    expect(statefulLayout.prepareSelectItem(node, items[0].value).title).toBe('Portail A (https://a.test)')
  })
})
