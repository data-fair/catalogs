import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import CatalogSchema from '#types/catalog/schema.js'

export default {
  $id: 'https://github.com/data-fair/catalogs/catalogs/post-req',
  title: 'CatalogsPostReq',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  additionalProperties: false,
  properties: {
    body:
      jsonSchema(CatalogSchema)
        .pickProperties(['title', 'plugin', 'owner'])
        .removeId()
        .appendTitle(' post')
        .schema
  }
}
