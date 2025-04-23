import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import CatalogSchema from '#types/catalog/schema.js'

export default {
  $id: 'https://github.com/data-fair/catalogs/catalogs/post-req',
  title: 'CatalogsPostReq',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  properties: {
    body:
      jsonSchema(CatalogSchema)
        .pickProperties(['title', 'description', 'plugin', 'owner', 'config'])
        .removeId()
        .appendTitle(' post')
        .schema
  }
}
