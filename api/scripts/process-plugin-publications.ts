import mongo from '#mongo'

const pluginId = process.argv[2]
if (!pluginId) {
  console.error('Usage: node process-plugin-publications.ts <plugin-id>')
  console.error('Exemple: node process-plugin-publications.ts @data-fair-catalog-udata-0')
  process.exit(1)
}

await mongo.connect()

try {
  const catalogs = await mongo.catalogs.find({ plugin: pluginId }).toArray()

  if (catalogs.length === 0) {
    console.log(`No catalogs found for plugin: ${pluginId}`)
    process.exit(0)
  }

  console.log(`${catalogs.length} catalogue(s) found for plugin ${pluginId}`)
  const catalogIds = catalogs.map(c => c._id)

  const result = await mongo.publications.updateMany(
    { 'catalog.id': { $in: catalogIds } },
    { $set: { status: 'waiting' }, $unset: { logs: 1 } }
  )

  console.log(`${result.modifiedCount} publication(s) set to 'waiting' status for reprocessing`)
} catch (error) {
  console.error('Error processing publications:', error)
  process.exit(1)
} finally {
  await mongo.client.close()
}

process.exit(0)
