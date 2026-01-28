<template>
  <v-container
    v-if="imp"
    data-iframe-height
    style="min-height:500px"
  >
    <h2 class="text-h5 mb-2">
      Import {{ imp.remoteResource?.title ?? imp.remoteResource.id }}
    </h2>
    <v-defaults-provider
      :defaults="{
        global: {
          hideDetails: 'auto'
        },
        VNumberInput: {
          inset: true
        }
      }"
    >
      <v-form v-model="valid">
        <vjsf
          v-if="importSchema && editImport"
          v-model="editImport"
          :schema="importSchema"
          :options="vjsfOptions"
          @update:model-value="patch.execute()"
        >
          <template #scheduling-summary="{ node }">
            {{ t(`frequency.${node.data.type}`) }}
            {{ cronstrue.toString(toCRON(node.data), { locale: session.lang.value }) }}
            {{ timezoneLabel(node.data.timeZone) }}
          </template>
        </vjsf>
      </v-form>
    </v-defaults-provider>

    <h3 class="text-h6 mt-4">
      {{ t('logSection') }}
    </h3>
    <logs
      type="import"
      :item="imp"
    />
    <layout-actions>
      <import-actions :imp />
    </layout-actions>
  </v-container>
</template>

<script setup lang="ts">
import type { Log } from '@data-fair/types-catalogs'
import type { Import } from '#api/types'

import timeZones from 'timezones.json'
import cronstrue from 'cronstrue'
import 'cronstrue/locales/en'
import 'cronstrue/locales/fr'

import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { toCRON } from '@data-fair/catalogs-shared/cron.ts'
import { resolvedSchema as importSchemaBase } from '#api/types/import'

const { t } = useI18n()
const route = useRoute<'/catalogs/[catalogId]/imports/[importId]'>()
const session = useSessionAuthenticated()
const ws = useWS('/catalogs/api/')
const { catalog, plugin } = createCatalogStore(route.params.catalogId)

const valid = ref(false)
const imp = ref<Import | null>(null)
const editImport: Ref<Partial<Import> | null> = ref(null)

const importFetch = useFetch<Import>(`${$apiPath}/imports/${route.params.importId}`)
watch(importFetch.data, (newImp) => {
  if (!newImp) return
  imp.value = newImp
  editImport.value = {
    config: newImp.config,
    scheduling: newImp.scheduling,
    isSchedulingActive: newImp.isSchedulingActive,
    shouldUpdateMetadata: newImp.shouldUpdateMetadata,
    shouldUpdateSchema: newImp.shouldUpdateSchema
  }

  setBreadcrumbs([
    { text: t('catalogs'), to: '/catalogs' },
    { text: newImp.catalog.title ?? newImp.catalog.id, to: `/catalogs/${newImp.catalog.id}` },
    { text: t('imports'), to: `/catalogs/${newImp.catalog.id}` },
    { text: newImp.remoteResource.title ?? newImp.remoteResource.id }
  ])
})

ws?.subscribe<Partial<Import>>(
  `import/${route.params.importId}`,
  (patch) => { if (imp.value) Object.assign(imp.value, patch) }
)
ws?.subscribe<Log>(`import/${route.params.importId}/logs`, (log) => {
  if (!imp.value) return
  if (!imp.value.logs) imp.value.logs = []
  if (log.type === 'task') {
    const existingLogIndex = imp.value.logs.findIndex(l => l.type === 'task' && l.key === log.key)
    if (existingLogIndex !== -1) return Object.assign(imp.value.logs[existingLogIndex], log)
  }
  imp.value.logs.push(log)
})

const patch = useAsyncAction(
  async () => {
    // TODO: In VJSF, when we add a new item in an array, here like a scheduling,
    // valid stay true but the item added in the array is null (witout defaults values)
    // So we need to wait a bit to ensure the item is filled with defaults values
    await new Promise(resolve => setTimeout(resolve, 1))

    if (!valid.value) return
    const res = await $fetch<Import>(`${$apiPath}/imports/${route.params.importId}`, {
      method: 'PATCH',
      body: editImport.value,
    })

    if (imp.value) Object.assign(imp.value, res)
  },
  {
    error: t('errorSavingImport')
  }
)

const importSchema = computed(() => {
  if (!catalog.value || !plugin.value) return undefined
  const base = jsonSchema(importSchemaBase)
    .pickProperties(['config', 'isSchedulingActive', 'shouldUpdateMetadata', 'shouldUpdateSchema', 'scheduling'])

  if (catalog.value.capabilities.includes('importConfig') && plugin.value.importConfigSchema) {
    base.addProperty('config', plugin.value.importConfigSchema)
  }
  return base.schema
})

const timezoneLabel = (timeZone: string) => {
  if (timeZone === 'Europe/Paris') return ''
  return ' — ' + t('timezone') + ' ' + (timeZone ?? 'UTC')
}

const utcs: string[] = []
for (const tz of timeZones) {
  for (const utc of tz.utc) {
    if (!utcs.includes(utc)) utcs.push(utc)
  }
}

const vjsfOptions = computed<VjsfOptions>(() => ({
  context: {
    resourceId: imp.value?.remoteResource.id,
    catalogConfig: catalog.value?.config,
    origin: window.location.origin,
    utcs
  },
  density: 'comfortable',
  initialValidation: 'always',
  locale: session.lang.value,
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
      daily: Every day,
      hourly: ''
      monthly: Every month,
      weekly: Every week,
    imports: Imports
    logSection: Execution log of the last import
    timezone: 'Timezone:'

  fr:
    catalogs: Catalogues
    errorSavingImport: Erreur lors de la modification de l'import
    frequency:
      daily: Tous les jours,
      hourly: ''
      monthly: Tous les mois,
      weekly: Toutes les semaines,
    imports: Imports
    logSection: Journal d'execution
    timezone: 'Fuseau horaire :'

</i18n>

<style scoped>
</style>
