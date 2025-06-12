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
        v-if="!publicationSites.loading.value"
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
const { catalog, dataFairDataset } = defineProps<{
  catalog?: {
    id: string
    title?: string
  },
  dataFairDataset?: {
    id: string
    title?: string
  },
}>()

// Notify parent component when a new publication is created
const emit = defineEmits(['onPublish'])

const initPublication = () => {
  const pub: Record<string, any> = {}
  if (catalog) pub.catalog = { id: catalog.id }
  if (dataFairDataset) pub.dataFairDataset = { id: dataFairDataset.id }
  return pub
}
const validPublication = ref(false)
const newPublication = ref<Record<string, any>>(initPublication())

const publicationSchema = computed(() => {
  const schema = clone(publicationSchemaBase)
  schema.required = ['catalog', 'action', 'dataFairDataset']
  // TODO: make required remoteDataset if action is not create
  return schema
})

const publicationSites = useFetch<object[]>(`${window.location.origin}/data-fair/api/v1/settings/${session.state.account.type}/${session.state.account.id}/publication-sites`)
const formatedPublicationSites = computed(() => {
  if (!publicationSites.data.value) return {}

  return publicationSites.data.value.reduce((acc: Record<string, any>, site: any) => {
    acc[`${site.type}:${site.id}`] = {
      title: site.title,
      url: site.url
    }
    return acc
  }, {})
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

const vjsfOptions = computed<VjsfOptions>(() => ({
  context: {
    catalog: {
      id: catalog?.id,
      title: catalog?.title
    },
    dataFairDataset: {
      id: dataFairDataset?.id,
      title: dataFairDataset?.title
    },
    origin: window.location.origin,
    publicationSites: formatedPublicationSites.value
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
    publish: Publish
    tutorialMessage: You can publish your datasets to one or more catalogs. This publication will make your data easier to find and allow the Open Data community to engage with you.

  fr:
    publish: Publier
    tutorialMessage: Vous pouvez publier vos jeux de données sur un ou plusieurs catalogues. Cette publication rendra vos données plus faciles à trouver et permettra à la communauté Open Data d'échanger avec vous.

</i18n>

<style scoped>
</style>
