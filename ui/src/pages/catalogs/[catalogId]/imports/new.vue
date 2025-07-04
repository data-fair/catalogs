<template>
  <v-container
    data-iframe-height
    class="pa-0"
    fluid
  >
    <v-stepper
      v-model="step"
      flat
    >
      <v-stepper-header>
        <v-stepper-item
          :title="t('step1.title')"
          value="1"
          :color="step === '1' ? 'primary' : ''"
          :complete="!!selectedResource"
          editable
        />

        <v-divider />
        <v-stepper-item
          :title="t('step2.title')"
          value="2"
          :color="step === '2' ? 'primary' : ''"
          :editable="!!selectedResource"
        />
      </v-stepper-header>

      <v-stepper-window class="mb-4">
        <v-stepper-window-item value="1">
          <import-select-resource
            v-if="catalog && plugin"
            v-model="selectedResource"
            :catalog="catalog"
            :plugin="plugin"
          />
        </v-stepper-window-item>

        <v-stepper-window-item
          value="2"
          class="ma-1"
        >
          <v-defaults-provider
            :defaults="{
              global: {
                hideDetails: 'auto'
              }
            }"
          >
            <v-form v-model="validImportConfig">
              <vjsf
                v-model="importConfig"
                :schema="importSchema"
                :options="vjsfOptions"
                @update:model-value="'todo'"
              >
                <template #scheduling-summary="{ node }">
                  {{ t(`frequency.${node.data.type}`) }}
                  {{ cronstrue.toString(toCRON(node.data), { locale: session.lang.value }) }}
                </template>
              </vjsf>
            </v-form>
          </v-defaults-provider>
        </v-stepper-window-item>
      </v-stepper-window>

      <template #actions="{ prev, next }">
        <v-stepper-actions
          @click:prev="prev"
          @click:next="handleNext(next)"
        >
          <template #prev="{ props }">
            <v-btn
              v-if="step === '2'"
              v-bind="props"
            >
              {{ t('previous') }}
            </v-btn>
          </template>

          <template #next="{ props }">
            <v-spacer v-if="step === '1'" />
            <v-btn
              v-bind="props"
              color="primary"
              variant="flat"
              :disabled="step === '1' ? !selectedResource : (!validImportConfig || !selectedResource)"
              :loading="step === '2' ? createImport.loading.value : false"
            >
              {{ t(`step${step}.next`) }}
            </v-btn>
          </template>
        </v-stepper-actions>
      </template>
    </v-stepper>
  </v-container>
</template>

<script setup lang="ts">
import type { Import } from '#api/types'

import cronstrue from 'cronstrue'
import 'cronstrue/locales/en'
import 'cronstrue/locales/fr'

import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { resolvedSchema as importSchemaBase } from '#api/types/import/index.ts'
import { toCRON } from '@data-fair/catalogs-shared/cron.ts'

const { t } = useI18n()
const route = useRoute<'/catalogs/[catalogId]/imports/[importId]'>()
const router = useRouter()
const session = useSessionAuthenticated()
const { catalog, plugin } = createCatalogStore(route.params.catalogId)

const step = ref('1')
const selectedResource = ref<{ id: string, title: string, origin?: string } | null>(null)
const validImportConfig = ref(false)
const importConfig = ref<Partial<Import>>({})

const importSchema = computed(() => {
  const schema = jsonSchema(importSchemaBase)

  if (catalog.value?.capabilities.includes('importConfig')) {
    schema.addProperty('config', { ...plugin.value?.importConfigSchema })
  }
  return schema.makePatchSchema().schema
})

const createImport = useAsyncAction(async () => {
  if (!selectedResource.value || !validImportConfig.value) return

  const newImport: Record<string, any> = {
    catalog: {
      id: catalog.value?._id,
      title: catalog.value?.title
    },
    remoteResource: {
      id: selectedResource.value.id,
      title: selectedResource.value.title
    },
    scheduling: importConfig.value.scheduling,
    config: importConfig.value.config || {}
  }
  if (importConfig.value.dataFairDataset) {
    newImport.dataFairDataset = importConfig.value.dataFairDataset
  }
  if (selectedResource.value.origin) {
    newImport.remoteResource.origin = selectedResource.value.origin
  }

  // Create the import via API
  await $fetch('/imports', {
    method: 'POST',
    body: newImport
  })

  selectedResource.value = null
  validImportConfig.value = false
  importConfig.value = {}
  await router.replace({ path: `/catalogs/${catalog.value?._id}` })
})

const handleNext = (next: () => void) => {
  if (step.value === '2') createImport.execute()
  else next()
}

watch(catalog, (newCatalog) => {
  if (!newCatalog) return
  setBreadcrumbs([
    { text: t('catalogs'), to: '/catalogs' },
    { text: newCatalog.title ?? newCatalog._id, to: `/catalogs/${newCatalog._id}` },
    { text: t('imports'), to: `/catalogs/${newCatalog._id}` },
    { text: t('createNewImport') }
  ])
})

const vjsfOptions = computed<VjsfOptions>(() => ({
  context: {
    resourceId: selectedResource.value?.id || '',
    catalogConfig: catalog.value?.config,
    origin: window.location.origin,

  },
  density: 'comfortable',
  initialValidation: 'always',
  locale: session.lang.value,
  readOnlyPropertiesMode: 'hide',
  titleDepth: 4,
  validateOn: 'blur',
  xI18n: true
}))

</script>

<i18n lang="yaml">
  en:
    catalogs: Catalogs
    createNewImport: Create a new import
    frequency:
      daily: Every day,
      hourly: ''
      monthly: Every month,
      weekly: Every week,
    imports: Imports
    previous: Previous
    step1:
      next: Next
      title: Select Resource
    step2:
      next: Import
      title: Import Configuration

  fr:
    catalogs: Catalogues
    createNewImport: Créer un nouvel import
    frequency:
      daily: Tous les jours,
      hourly: ''
      monthly: Tous les mois,
      weekly: Toutes les semaines,
    imports: Imports
    previous: Précédent
    step1:
      next: Suivant
      title: Sélection d'une ressource
    step2:
      next: Importer
      title: Configuration de l'import

</i18n>

<style scoped>
</style>
