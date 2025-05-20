<template>
  <tutorial-alert
    id="tutorial-publications"
    :text="t('tutorialMessage')"
  />
  <v-defaults-provider
    :defaults="{
      global: {
        hideDetails: 'auto'
      }
    }"
  >
    <v-form v-model="validPublication">
      <vjsf
        v-model="newPublication"
        :schema="publicationSchema"
        :options="vjsfOptions"
      />
    </v-form>
  </v-defaults-provider>
  <v-btn
    class="mt-2"
    color="primary"
    variant="flat"
    :disabled="!validPublication"
    :loading="publishCatalog.loading.value"
    @click="publishCatalog.execute()"
  >
    {{ t('publish') }}
  </v-btn>
</template>

<script setup lang="ts">
import tutorialAlert from '@data-fair/lib-vuetify/tutorial-alert.vue'
import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import clone from '@data-fair/lib-utils/clone.js'
import { resolvedSchema as publicationSchemaBase } from '#api/types/publication/index.ts'

const { t } = useI18n()
const session = useSessionAuthenticated()

// Optional default values
const { catalogId, dataFairDatasetSlug } = defineProps<{
  catalogId?: string,
  dataFairDatasetSlug?: string,
}>()

// Notify parent component when a new publication is created
const emit = defineEmits(['onPublish'])

const initPublication = () => {
  const pub: Record<string, any> = {}
  if (catalogId) pub.catalog = { id: catalogId }
  if (dataFairDatasetSlug) pub.dataFairDataset = { slug: dataFairDatasetSlug }
  return pub
}
const validPublication = ref(false)
const newPublication = ref<Record<string, any>>(initPublication())

const publicationSchema = computed(() => {
  const schema = clone(publicationSchemaBase)
  schema.required = ['catalog', 'action', 'dataFairDataset']
  // TODO: make required remoteDatasetId if action is not create
  return schema
})

const publishCatalog = useAsyncAction(
  async () => {
    if (!validPublication.value) return
    await $fetch('/publications', {
      method: 'POST',
      body: newPublication.value,
    })
    newPublication.value = initPublication()
    emit('onPublish')
  }
)

const vjsfOptions: VjsfOptions = {
  context: {
    catalogId,
    dataFairDatasetSlug,
    origin: window.location.origin
  },
  density: 'comfortable',
  initialValidation: 'always',
  locale: session.lang.value,
  readOnlyPropertiesMode: 'hide',
  titleDepth: 4,
  useExamples: 'help',
  validateOn: 'blur',
  xI18n: true
}

</script>

<i18n lang="yaml">
  en:
    cancel: Cancel
    noCatalogs: You have not yet configured any catalog.
    noPublications: This dataset is not yet published on any catalog
    publicationsList: List of publications
    publish: Publish
    publishToCatalog: Publish to another catalog
    tutorialMessage: You can publish your datasets to one or more catalogs. This publication will make your data easier to find and allow the Open Data community to engage with you.

  fr:
    cancel: Annuler
    noCatalogs: Vous n'avez pas encore configuré de calalogue.
    noPublications: Ce jeu de données n'est encore publié sur aucun catalogue
    publicationsList: Liste des publications
    publish: Publier
    publishToCatalog: Publier sur un catalogue
    tutorialMessage: Vous pouvez publier vos jeux de données sur un ou plusieurs catalogues. Cette publication rendra vos données plus faciles à trouver et permettra à la communauté Open Data d'échanger avec vous.

</i18n>

<style scoped>
</style>
