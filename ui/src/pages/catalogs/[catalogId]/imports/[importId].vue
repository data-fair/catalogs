<template>
  <v-container
    v-if="importFetch.data.value"
    style="min-height:500px"
    data-iframe-height
  >
    <h2 class="text-h6">
      Import {{ importFetch.data.value.remoteResource?.title ?? importFetch.data.value.remoteResource.id }}
    </h2>
    <v-defaults-provider
      :defaults="{
        global: {
          hideDetails: 'auto'
        }
      }"
    >
      <v-form v-model="valid">
        <vjsf
          v-if="importSchema && imp"
          v-model="editImport"
          :schema="importSchema"
          :options="vjsfOptions"
          @update:model-value="patch.execute()"
        >
          <template #scheduling-summary="{ node }">
            {{ t(`frequency.${node.data.type}`) }}
            {{ cronstrue.toString(toCRON(node.data), { locale: session.lang.value }) }}
          </template>
        </vjsf>
      </v-form>
    </v-defaults-provider>

    <layout-actions>
      <import-actions :imp="importFetch.data.value" />
    </layout-actions>
  </v-container>
</template>

<script setup lang="ts">
import type { Import } from '#api/types'

import cronstrue from 'cronstrue'
import 'cronstrue/locales/en'
import 'cronstrue/locales/fr'

import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { toCRON } from '@data-fair/catalogs-shared/cron.ts'
import { resolvedSchema as importSchemaBase } from '#api/types/import/index.ts'

const { t } = useI18n()
const route = useRoute<'/catalogs/[catalogId]/imports/[importId]'>()
const session = useSessionAuthenticated()
const { catalog, plugin } = createCatalogStore(route.params.catalogId)

const importFetch = useFetch<Import>(`${$apiPath}/imports/${route.params.importId}`)
const imp = ref<Import | null>(null)
watch(importFetch.data, () => { imp.value = importFetch.data.value })

const valid = ref(false)
const editImport: Ref<Partial<Import>> = ref({})

watch(imp, (newImp) => {
  if (newImp) {
    editImport.value = {
      config: newImp.config,
      dataFairDataset: newImp.dataFairDataset,
      scheduling: newImp.scheduling
    }
  }
}, { immediate: true })

const importSchema = computed(() => {
  const schema = jsonSchema(importSchemaBase)
  if (catalog.value?.capabilities.includes('importConfig')) {
    schema.addProperty('config', { ...plugin.value?.importConfigSchema })
  }

  return schema.makePatchSchema().schema
})

const patch = useAsyncAction(
  async () => {
    // In VJSF, when we add a new item in an array, here like a scheduling,
    // valid stay true but the item added in the array is null (witout defaults values)
    // So we need to wait a bit to ensure the item is filled with defaults values
    await new Promise(resolve => setTimeout(resolve, 1))

    if (!valid.value) return
    const res = await $fetch(`${$apiPath}/imports/${route.params.importId}`, {
      method: 'PATCH',
      body: editImport.value,
    })

    if (imp.value) Object.assign(imp.value, res)
  },
  {
    error: t('errorSavingImport')
  }
)

watch(importFetch.data, async (imp) => {
  if (!imp) return

  setBreadcrumbs([
    { text: t('catalogs'), to: '/catalogs' },
    { text: imp.catalog.title ?? imp.catalog.id, to: `/catalogs/${imp.catalog.id}` },
    { text: t('imports'), to: `/catalogs/${imp.catalog.id}` },
    { text: imp.remoteResource.title ?? imp.remoteResource.id }
  ])
})

const vjsfOptions = computed<VjsfOptions>(() => ({
  context: {
    resourceId: importFetch.data.value?.remoteResource.id || '',
    catalogConfig: catalog.value?.config,
    origin: window.location.origin
  },
  density: 'comfortable',
  initialValidation: 'always',
  locale: session.lang.value,
  readOnlyPropertiesMode: 'hide',
  removeAdditional: true,
  titleDepth: 4,
  updateOn: 'blur',
  validateOn: 'blur',
  xI18n: true
}))

</script>

<i18n lang="yaml">
  en:
    catalogs: Catalogs
    errorSavingImport: Error while saving the import
    frequency:
      monthly: Every month,
      weekly: Every week,
      daily: Every day,
      hourly: ''
    imports: Imports

  fr:
    catalogs: Catalogues
    errorSavingImport: Erreur lors de la modification de l'import
    frequency:
      monthly: Tous les mois,
      weekly: Toutes les semaines,
      daily: Tous les jours,
      hourly: ''
    imports: Imports

</i18n>

<style scoped>
</style>
