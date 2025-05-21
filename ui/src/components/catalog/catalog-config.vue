<template>
  <v-defaults-provider
    :defaults="{
      global: {
        hideDetails: 'auto'
      }
    }"
  >
    <v-form v-model="valid">
      <vjsf
        v-if="catalogSchema"
        v-model="editCatalog"
        :schema="catalogSchema"
        :options="vjsfOptions"
        @update:model-value="patch.execute()"
      >
        <template #activity>
          <activity :resource="Object.assign(catalog, editCatalog)" />
        </template>
      </vjsf>
    </v-form>
  </v-defaults-provider>
</template>

<script setup lang="ts">
import type { Catalog, Plugin } from '#api/types'

import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { resolvedSchema as catalogSchemaBase } from '#api/types/catalog/index.ts'

const { catalog, plugin, catalogId, canAdmin } = defineProps<{
  catalog: Catalog
  plugin: Plugin
  catalogId: string
  canAdmin: boolean
}>()

const session = useSessionAuthenticated()
const { t } = useI18n()

const valid = ref(false)
const editCatalog: Ref<Catalog> = ref({ ...catalog })

const catalogSchema = computed(() => {
  const schema = jsonSchema(catalogSchemaBase)
    .addProperty('config', { ...plugin.configSchema, title: t('configuration') })
    .makePatchSchema()
    .schema
  return schema
})

const patch = useAsyncAction(
  async () => {
    if (!valid.value || !canAdmin) return
    const res = await $fetch(`/catalogs/${catalogId}`, {
      method: 'PATCH',
      body: JSON.stringify(editCatalog.value),
    })

    Object.assign(editCatalog.value, {
      updated: res.updated
    })
  },
  {
    error: t('errorSavingCatalog')
  }
)

const vjsfOptions = computed<VjsfOptions>(() => ({
  density: 'comfortable',
  initialValidation: 'always',
  locale: session.lang.value,
  readOnly: !canAdmin,
  removeAdditional: true,
  titleDepth: 3,
  updateOn: 'blur',
  // useExamples: 'help',
  validateOn: 'blur',
  xI18n: true
}))

</script>

<i18n lang="yaml">
  en:
    configuration: Configuration
    errorSavingCatalog: Error while saving the catalog

  fr:
    configuration: Configuration
    errorSavingCatalog: Erreur lors de la modification du catalogue

</i18n>

<style scoped>
</style>
