import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import PluginSchema from '#types/plugin/schema.ts'

export default {
  $id: 'https://github.com/data-fair/catalogs/plugins/post-req',
  title: 'PluginsPostReq',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  properties: {
    body:
      jsonSchema(PluginSchema)
        .pickProperties(['name', 'version'])
        .removeId()
        .appendTitle(' post')
        .schema
  }
}
