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
        .pickProperties(['catalog', 'remoteResource'])
        .removeId()
        .appendTitle(' post')
        .schema
  }
}
