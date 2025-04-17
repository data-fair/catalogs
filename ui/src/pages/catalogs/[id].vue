<template>
  <v-container
    v-if="catalog"
    data-iframe-height
  >
    <h2 class="text-h6">
      {{ t('catalogTitle', { title: catalog.title }) }}
    </h2>
    <v-defaults-provider
      :defaults="{
        global: {
          hideDetails: 'auto'
        }
      }"
    >
      <v-form
        v-model="valid"
        autocomplete="off"
      >
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
              :title="`${catalog.updated.name} - ${dayjs(catalog.updated.date).format('D MMM YYYY HH:mm')}`"
            />
            <v-list-item
              :prepend-icon="mdiPlusCircleOutline"
              :title="`${catalog.created.name} - ${dayjs(catalog.updated.date).format('D MMM YYYY HH:mm')}`"
            />
          </template>
        </vjsf>
      </v-form>
    </v-defaults-provider>
    <list-remote-datasets
      v-if="plugin?.metadata.capabilities.includes('listDatasets')"
      class="mt-4"
      :catalog="catalog"
    />
    <layout-actions v-if="canAdmin">
      <catalog-actions
        :catalog="catalog"
        :can-admin="canAdmin"
        :is-small="true"
      />
    </layout-actions>
  </v-container>
</template>

<script setup lang="ts">
import type { Plugin, Catalog } from '#api/types'

import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import VjsfMarkdown from '@koumoul/vjsf-markdown'
import { getAccountRole } from '@data-fair/lib-vue/session'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { resolvedSchema as catalogSchemaBase } from '#api/types/catalog/index.ts'

const route = useRoute<'/catalogs/[id]'>()
const session = useSessionAuthenticated()
const { dayjs } = useLocaleDayjs()
const { t } = useI18n()

const valid = ref(false)
const editCatalog: Ref<Catalog | null> = ref(null)
const catalog = ref<Catalog | null>(null)
const plugin = ref<Plugin | null>(null)
const avatarUrl = computed(() => {
  if (!catalog.value) return ''
  if (catalog.value.owner.department) return `/simple-directory/api/avatars/${catalog.value.owner.type}/${catalog.value.owner.id}/${catalog.value.owner.department}/avatar.png`
  else return `/simple-directory/api/avatars/${catalog.value.owner.type}/${catalog.value.owner.id}/avatar.png`
})

onMounted(async () => {
  catalog.value = await $fetch(`/catalogs/${route.params.id}`)
  if (catalog.value) {
    plugin.value = await $fetch(`/plugins/${catalog.value.plugin}`)
    editCatalog.value = { ...catalog.value }
  }

  setBreadcrumbs([{
    text: t('catalogs'),
    to: '/catalogs'
  }, {
    text: catalog.value?.title || ''
  }])
})

const canAdmin = computed(() => {
  if (!catalog.value) return false
  return getAccountRole(session.state, catalog.value.owner) === 'admin'
})

const catalogSchema = computed(() => {
  if (!plugin.value) return
  const schema = jsonSchema(catalogSchemaBase)
    .addProperty('config', { ...plugin.value.configSchema, title: t('configuration') })
    .makePatchSchema()
    .schema
  return schema
})

const patch = useAsyncAction(
  async () => {
    if (!valid.value || !canAdmin.value) return
    await $fetch(`/catalogs/${route.params.id}`, {
      method: 'PATCH',
      body: editCatalog.value
    })

    Object.assign(catalog.value || {}, editCatalog.value)
  },
  {
    error: t('errorSavingCatalog')
  }
)

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
  readOnly: !canAdmin.value,
  removeAdditional: true,
  titleDepth: 3,
  updateOn: 'blur',
  validateOn: 'blur',
  xI18n: true
}))
</script>

<i18n lang="yaml">
  en:
    catalogs: Catalogs
    catalogTitle: Catalog {title}
    configuration: Configuration
    errorSavingCatalog: Error while saving the catalog

  fr:
    catalogs: Catalogues
    catalogTitle: Catalogue {title}
    configuration: Configuration
    errorSavingCatalog: Erreur lors de la modification du catalogue
</i18n>

<style scoped>
</style>
