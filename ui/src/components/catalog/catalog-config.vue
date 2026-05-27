<template>
  <v-defaults-provider
    v-if="catalogSchema"
    :defaults="{
      global: {
        hideDetails: 'auto'
      }
    }"
  >
    <v-form v-model="valid">
      <vjsf
        v-if="editCatalog"
        v-model="editCatalog"
        :schema="catalogSchema"
        :options="vjsfOptions"
      >
        <template #activity>
          <catalog-activity />
        </template>
      </vjsf>
    </v-form>
  </v-defaults-provider>
</template>

<script setup lang="ts">
import type { Catalog } from '#api/types'

import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { resolvedSchema as catalogSchemaBase } from '#api/types/catalog'

const editCatalog = defineModel<Partial<Catalog> | null>({ required: true })
const valid = defineModel<boolean | null>('valid', { required: true })

const { t } = useI18n()
const session = useSessionAuthenticated()
const { catalog, plugin } = useCatalogStore()

const hasPluginConfig = computed(() => {
  const props = plugin.value?.configSchema?.properties as Record<string, unknown> | undefined
  return !!props && Object.keys(props).length > 0
})

const catalogSchema = computed(() => {
  const builder = jsonSchema(catalogSchemaBase).removeReadonlyProperties()
  if (hasPluginConfig.value) {
    builder.addProperty('config', { ...plugin.value!.configSchema, title: t('configuration') })
  }
  return builder.schema
})

const vjsfOptions = computed<VjsfOptions>(() => ({
  context: {
    owner: catalog.value?.owner
  },
  density: 'comfortable',
  locale: session.lang.value,
  titleDepth: 3,
  validateOn: 'blur',
  xI18n: true
}))

</script>

<i18n lang="yaml">
  en:
    configuration: Configuration
  fr:
    configuration: Configuration
</i18n>

<style scoped>
</style>
