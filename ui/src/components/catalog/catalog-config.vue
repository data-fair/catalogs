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
        @update:model-value="patch.execute()"
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

const { t } = useI18n()
const session = useSessionAuthenticated()
const { catalog, plugin } = useCatalogStore()

const valid = ref(false)
const editCatalog: Ref<Partial<Catalog> | null> = ref(null)
editCatalog.value = {
  title: catalog.value?.title,
  config: catalog.value?.config
}
if (catalog.value?.description) editCatalog.value.description = catalog.value.description

const catalogSchema = computed(() => {
  const schema = jsonSchema(catalogSchemaBase)
    .removeReadonlyProperties()
    .addProperty('config', { ...plugin.value?.configSchema, title: t('configuration') })
    .schema
  return schema
})

const patch = useAsyncAction(
  async () => {
    if (!editCatalog.value || !valid.value) return
    const res = await $fetch(`/catalogs/${catalog.value?._id}`, {
      method: 'PATCH',
      body: {
        ...editCatalog.value,
        ...(!editCatalog.value.description ? { description: null } : {})
      }
    })

    if (catalog.value) Object.assign(catalog.value, res)
  },
  {
    error: t('errorSavingCatalog')
  }
)

const vjsfOptions = computed<VjsfOptions>(() => ({
  context: {
    owner: catalog.value?.owner
  },
  density: 'comfortable',
  initialValidation: 'always',
  locale: session.lang.value,
  removeAdditional: true,
  titleDepth: 3,
  updateOn: 'blur',
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
