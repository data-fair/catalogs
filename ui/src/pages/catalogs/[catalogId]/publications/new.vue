<template>
  <v-container
    data-iframe-height
    style="min-height:800px"
    class="pa-0"
    fluid
  >
    <v-stepper
      v-model="step"
      flat
    >
      <v-stepper-header>
        <v-stepper-item
          :title="t('stepTitles.configurePublication')"
          value="1"
          :color="step === '1' ? 'primary' : ''"
          :complete="validPublicationConfig"
          editable
        />

        <v-divider v-if="effectiveAction && effectiveAction !== 'createFolderInRoot'" />

        <v-stepper-item
          v-if="effectiveAction && effectiveAction !== 'createFolderInRoot'"
          :title="t(`stepTitles.${effectiveAction}`)"
          value="2"
          :color="step === '2' ? 'primary' : ''"
          :editable="!!selectedFolderOrResource"
        />
      </v-stepper-header>

      <v-stepper-window class="mb-4">
        <v-stepper-window-item value="1">
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
            <v-form v-model="validPublicationConfig">
              <vjsf
                v-if="publicationSchema"
                v-model="publicationConfig"
                :schema="publicationSchema"
                :options="vjsfOptions"
              />
            </v-form>
          </v-defaults-provider>
        </v-stepper-window-item>

        <v-stepper-window-item
          value="2"
          class="ma-1"
        >
          <resources-explorer
            v-if="catalog && plugin && effectiveAction"
            v-model="selectedFolderOrResource"
            :catalog="catalog"
            :plugin="plugin"
            :mode="effectiveAction"
          />
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
              {{ t('actionButtons.previous') }}
            </v-btn>
          </template>

          <template #next="{ props }">
            <v-spacer v-if="step === '1'" />
            <v-btn
              v-bind="props"
              color="primary"
              variant="flat"
              :disabled="step === '1' ? !validPublicationConfig: !selectedFolderOrResource"
              :loading="step === '2' ? createPublication.loading.value : false"
            >
              <template v-if="step === '1'">
                {{ effectiveAction === 'createFolderInRoot' ? t('actionButtons.createFolderInRoot') : t('actionButtons.next') }}
              </template>
              <template v-else>
                {{ t(`actionButtons.${effectiveAction}`) }}
              </template>
            </v-btn>
          </template>
        </v-stepper-actions>
      </template>
    </v-stepper>
  </v-container>
</template>

<script setup lang="ts">
import type { Capability } from '@data-fair/types-catalogs'
import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { resolvedSchema as publicationSchemaBase, type Publication } from '#api/types/publication'

const { t, mergeLocaleMessage } = useI18n()
const route = useRoute<'/catalogs/[catalogId]/imports/[importId]'>()
const router = useRouter()
const session = useSessionAuthenticated()
const datasetId = useStringSearchParam('datasetId')

const { catalog, plugin, pluginFetch } = createCatalogStore(route.params.catalogId)

const validPublicationConfig = ref(false)
const selectedFolderOrResource = ref<{ id: string, title: string, type: 'resource' | 'folder' } | null>(null)
const publicationConfig = ref<Partial<Pick<Publication, 'action' | 'dataFairDataset' | 'publicationSite' | 'remoteFolder' | 'remoteResource'>>>({})
const step = ref<'1' | '2'>('1')

// the plugin can override the action labels through its own i18n messages, and vjsf rebuilds
// its whole state tree whenever the schema changes identity. Building the schema before those
// messages are merged would show the generic labels first, then swap them in a visible flicker.
const pluginI18nSettled = ref(false)

// Get datafair dataset info if datasetId is provided
const dataFairDatasetFetch = useFetch<{ id: string; title: string }>(
  computed(() => `${$sitePath}/data-fair/api/v1/datasets/${datasetId.value}`),
  { query: { select: 'id,title', raw: true }, immediate: !!datasetId.value }
)
watch(dataFairDatasetFetch.data, (newData) => {
  if (newData) publicationConfig.value.dataFairDataset = { id: newData.id, title: newData.title }
})

// Get the list of publication sites (used to get the title, full url and dataset url template)
const publicationSites = useFetch<object[]>(`${$sitePath}/data-fair/api/v1/settings/${session.state.account.type}/${session.state.account.id}:*/publication-sites`)
const formattedPublicationSites = computed(() => {
  if (!publicationSites.data.value) return {}

  return publicationSites.data.value.reduce((acc: Record<string, any>, site: any) => {
    acc[`${site.type}:${site.id}`] = {
      title: site.title,
      url: site.url,
      datasetUrlTemplate: site.datasetUrlTemplate
    }
    return acc
  }, {})
})

const availableActions = computed(() => {
  if (!catalog.value) return []
  return [
    { title: t('actionLabels.createFolderInRoot'), value: 'createFolderInRoot' },
    { title: t('actionLabels.createFolder'), value: 'createFolder' },
    { title: t('actionLabels.createResource'), value: 'createResource' },
    { title: t('actionLabels.replaceFolder'), value: 'replaceFolder' },
    { title: t('actionLabels.replaceResource'), value: 'replaceResource' }
  ].filter(action => catalog.value?.capabilities.includes(action.value as Capability))
})

// a single available action is implicit, it is not offered as a form field
const defaultAction = computed(() => availableActions.value.length === 1
  ? availableActions.value[0].value as Publication['action']
  : null)

const publicationSchema = computed(() => {
  if (!catalog.value || !pluginI18nSettled.value) return null

  const propertiesToPick = ['dataFairDataset']
  if (availableActions.value.length > 1) propertiesToPick.push('action')

  if (catalog.value.capabilities.includes('requiresPublicationSite')) {
    if (!publicationSites.data.value) return null
    propertiesToPick.push('publicationSite')
  }

  const base = jsonSchema(publicationSchemaBase)
    .pickProperties(propertiesToPick)
    .schema

  if (base.properties.action) base.properties.action.layout.items = availableActions.value
  if (catalog.value.capabilities.includes('requiresPublicationSite')) base.required.push('publicationSite')

  return base
})

const effectiveAction = computed(() => publicationConfig.value.action ?? defaultAction.value)

const createPublication = useAsyncAction(async () => {
  if (!validPublicationConfig.value || (
    effectiveAction.value !== 'createFolderInRoot' &&
    !selectedFolderOrResource.value
  )) return

  const newPublication: Record<string, any> = {
    catalog: {
      id: catalog.value?._id,
      title: catalog.value?.title
    },
    ...publicationConfig.value,
    action: effectiveAction.value
  }
  if (selectedFolderOrResource.value?.type === 'folder') {
    newPublication.remoteFolder = {
      id: selectedFolderOrResource.value.id,
      title: selectedFolderOrResource.value.title
    }
  } else if (selectedFolderOrResource.value?.type === 'resource') {
    newPublication.remoteResource = {
      id: selectedFolderOrResource.value.id,
      title: selectedFolderOrResource.value.title
    }
  }

  // Create the publication via API
  const pub = await $fetch('/publications', {
    method: 'POST',
    body: newPublication
  })

  selectedFolderOrResource.value = null
  validPublicationConfig.value = false
  publicationConfig.value = {}
  await router.replace({ path: `/catalogs/${catalog.value?._id}/publications/${pub._id}` })
})

const handleNext = (next: () => void) => {
  if (step.value === '2' || effectiveAction.value === 'createFolderInRoot') createPublication.execute()
  else next()
}

// Watch plugin changes and merge its i18n messages
watch(plugin, (newPlugin) => {
  if (!newPlugin) return
  if (newPlugin.metadata.i18n?.[session.lang.value]) mergeLocaleMessage(session.lang.value, newPlugin.metadata.i18n[session.lang.value])
  pluginI18nSettled.value = true
})

// without a plugin there are no overrides to wait for, fall back to the generic labels
watch(pluginFetch.error, (error) => {
  if (error) pluginI18nSettled.value = true
})

watch(catalog, (newCatalog) => {
  if (!newCatalog) return
  setBreadcrumbs([
    { text: t('catalogs'), to: '/catalogs' },
    { text: newCatalog.title ?? route.params.catalogId, to: `/catalogs/${route.params.catalogId}` },
    { text: t('publications'), to: `/catalogs/${route.params.catalogId}` },
    { text: t('createNewPublication') }
  ])
})

const vjsfOptions = computed<VjsfOptions>(() => ({
  context: {
    dataFairDataset: {
      id: dataFairDatasetFetch.data.value?.id,
      title: dataFairDatasetFetch.data.value?.title
    },
    origin: window.location.origin,
    publicationSites: formattedPublicationSites.value,
    ownerFilter: `${catalog.value?.owner.type}:${catalog.value?.owner.id}${catalog.value?.owner.department ? `:${catalog.value?.owner.department}` : ''}`
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
    publications: Publications
    createNewPublication: Create new publication

    actionLabels:
      createFolderInRoot: Create folder in root
      createFolder: Create folder
      createResource: Create resource
      replaceFolder: Replace folder
      replaceResource: Replace resource

    actionButtons:
      previous: Previous
      next: Next
      createFolderInRoot: Create publication
      createFolder: Create publication here
      createResource: Create publication here
      replaceFolder: Replace this folder
      replaceResource: Replace this resource

    stepTitles:
      configurePublication: Configure publication
      createFolder: Destination folder selection
      createResource: Destination folder selection
      replaceFolder: Folder to replace selection
      replaceResource: Resource to replace selection

  fr:
    catalogs: Catalogues
    publications: Publications
    createNewPublication: Créer une nouvelle publication

    actionLabels:
      createFolderInRoot: Créer un dossier à la racine
      createFolder: Créer un dossier
      createResource: Créer une ressource
      replaceFolder: Écraser un dossier
      replaceResource: Écraser une ressource

    actionButtons:
      previous: Précédent
      next: Suivant
      createFolderInRoot: Créer la publication
      createFolder: Créer la publication ici
      createResource: Créer la publication ici
      replaceFolder: Écraser ce dossier
      replaceResource: Écraser cette ressource

    stepTitles:
      configurePublication: Configuration de la publication
      createFolder: Sélection du dossier de destination
      createResource: Sélection du dossier de destination
      replaceFolder: Sélection du dossier à écraser
      replaceResource: Sélection de la ressource à écraser
</i18n>

<style scoped>
</style>
