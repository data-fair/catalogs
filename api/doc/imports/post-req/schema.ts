import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import ImportSchema from '#types/import/schema.ts'

export default {
  $id: 'https://github.com/data-fair/catalogs/import/post-req',
  title: 'ImportPostReq',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  properties: {
    body:
      jsonSchema(ImportSchema)
        .pickProperties(['catalog', 'dataFairDataset', 'separator', 'remoteResource', 'scheduling', 'config', 'isSchedulingActive', 'shouldUpdateMetadata', 'shouldUpdateSchema'])
        // left to the defaults of the import schema, applied by the route: a create names its resource,
        // its scheduling and update flags can follow (the import configuration form)
        .removeFromRequired(['scheduling', 'shouldUpdateMetadata', 'shouldUpdateSchema'])
        .removeId()
        .appendTitle(' post')
        .schema
  }
}
