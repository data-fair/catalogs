import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import PluginSchema from '#types/plugin/schema.js'

export default {
  $id: 'https://github.com/data-fair/catalogs/plugin/post-req',
  title: 'Post catalogs req',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  additionalProperties: false,
  properties: {
    body:
      jsonSchema(PluginSchema)
        .pickProperties(['id', 'name', 'description', 'version'])
        .removeId()
        .appendTitle(' post')
        .schema
  }
}
