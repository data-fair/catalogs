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
          <v-list-item
            :prepend-avatar="avatarUrl"
            :title="catalog.owner.name"
          />
          <v-list-item
            :prepend-icon="mdiPencil"
            :title="`${catalog.updated.name}`"
            :subtitle="`${dayjs(catalog.updated.date).format('D MMM YYYY HH:mm')}`"
          />
          <v-list-item
            :prepend-icon="mdiPlusCircleOutline"
            :title="`${catalog.created.name}`"
            :subtitle="`${dayjs(catalog.created.date).format('D MMM YYYY HH:mm')}`"
          />
        </template>
      </vjsf>
    </v-form>
  </v-defaults-provider>
</template>

<script setup lang="ts">
import type { Catalog, Plugin } from '#api/types'

import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import VjsfMarkdown from '@koumoul/vjsf-markdown'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { resolvedSchema as catalogSchemaBase } from '#api/types/catalog/index.ts'

const { catalog, plugin, catalogId, canAdmin } = defineProps<{
  catalog: Catalog
  plugin: Plugin
  catalogId: string
  canAdmin: boolean
}>()

const session = useSessionAuthenticated()
const { dayjs } = useLocaleDayjs()
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
    await $fetch(`/catalogs/${catalogId}`, {
      method: 'PATCH',
      body: JSON.stringify(editCatalog.value),
    })

    Object.assign(catalog || {}, editCatalog.value)
  },
  {
    error: t('errorSavingCatalog')
  }
)

const avatarUrl = computed(() => {
  if (catalog.owner.department) return `/simple-directory/api/avatars/${catalog.owner.type}/${catalog.owner.id}/${catalog.owner.department}/avatar.png`
  else return `/simple-directory/api/avatars/${catalog.owner.type}/${catalog.owner.id}/avatar.png`
})

const vjsfOptions = computed<VjsfOptions>(() => ({
  density: 'comfortable',
  initialValidation: 'always',
  locale: session.lang.value,
  plugins: [VjsfMarkdown],
  pluginsOptions: {
    markdown: {
      easyMDEOptions: { maxHeight: '100px' }
    }
  },
  readOnly: !canAdmin,
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
