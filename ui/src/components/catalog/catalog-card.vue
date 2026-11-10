<template>
  <card-shell
    :title="catalog.title"
    :to="`/catalogs/${ catalog._id }` + ($route.query.showAll ? `?showAll=${$route.query.showAll}` : '')"
    :owner="showOwner ? catalog.owner : undefined"
  >
    <template #prepend>
      <!-- plugin thumbnail, square and as tall as the title (1 or 2 lines); its name is already in the plugin line -->
      <div
        v-if="thumbnailUrl"
        ref="logoEl"
        class="catalog-card-logo"
        :style="{ backgroundImage: `url(&quot;${thumbnailUrl}&quot;)`, width: logoSize, height: logoSize }"
      />
    </template>

    <!-- Plugin name -->
    <card-meta-line
      :icon="mdiPowerPlug"
      :icon-color="plugin ? 'primary' : undefined"
      :color="plugin ? undefined : 'error'"
      :text="plugin?.title || `${t('deleted')} - ${catalog.plugin}`"
    />

    <!-- Imports and publications counts -->
    <div
      v-if="canImport || canPublish"
      class="d-flex ga-4"
      style="min-width: 0"
    >
      <card-meta-line
        v-if="canImport"
        :icon="mdiDownload"
        icon-color="primary"
        :text="t('imports', catalog.importsCount || 0)"
      />
      <card-meta-line
        v-if="canPublish"
        :icon="mdiUpload"
        icon-color="primary"
        :text="t('publications', catalog.publicationsCount || 0)"
      />
    </div>

    <template #footer>
      <!-- Modification and creation dates -->
      <card-dates
        :updated-at="catalog.updated.date"
        :created-at="catalog.created.date"
      />
      <!-- Errors of the imports and publications, on the right -->
      <v-spacer />
      <card-state-info
        v-if="errors"
        :icon="mdiAlert"
        color="error"
        :text="t('errors', errors)"
        strong
      >
        <div v-if="catalog.importsErrorCount">
          {{ t('importsError', catalog.importsErrorCount) }}
        </div>
        <div v-if="catalog.publicationsErrorCount">
          {{ t('publicationsError', catalog.publicationsErrorCount) }}
        </div>
      </card-state-info>
      <card-state-info
        v-else
        :icon="mdiCheckCircle"
        color="success"
        :title="t('noError')"
        :help="t('noErrorHelp')"
      />
    </template>
  </card-shell>
</template>

<script setup lang="ts">
import type { CatalogsGetRes } from '#api/doc'
import { mdiPowerPlug } from '@mdi/js'

const { t } = useI18n()
const { catalog, showOwner, plugin } = defineProps<{
  catalog: CatalogsGetRes['results'][number]
  /** Registry artefact of this catalog's plugin — absent if it was removed from the registry. */
  plugin?: { title: string, thumbnail?: { id: string } }
  showOwner?: boolean
}>()

// Thumbnail to display, if any: a plugin-provided dynamic URL takes precedence,
// otherwise the registry-hosted thumbnail uploaded for the plugin artefact.
const thumbnailUrl = computed(() => {
  if (catalog.capabilities.includes('thumbnailUrl') && catalog.thumbnailUrl) return catalog.thumbnailUrl
  if (plugin?.thumbnail) return `${$sitePath}/registry/api/v1/thumbnails/${plugin.thumbnail.id}/data`
  return null
})

const canImport = computed(() => catalog.capabilities.includes('import'))
const canPublish = computed(() => catalog.capabilities.some(c => ['createFolderInRoot', 'createFolder', 'createResource', 'replaceFolder', 'replaceResource'].includes(c)))
const errors = computed(() => (catalog.importsErrorCount ?? 0) + (catalog.publicationsErrorCount ?? 0))

// the logo is as tall as the title: 1 line, 2 when the title wraps (a bigger logo only narrows the title, so it settles)
const logoEl = ref<HTMLElement>()
const twoLines = ref(false)
const logoSize = computed(() => twoLines.value ? '3rem' : '1.5rem')
let observer: ResizeObserver | undefined
watch(logoEl, (el) => {
  observer?.disconnect()
  const title = el?.closest('.df-card')?.querySelector<HTMLElement>('.df-card-title')
  if (!title) return
  const update = () => { twoLines.value = title.getBoundingClientRect().height > parseFloat(getComputedStyle(title).lineHeight) * 1.5 }
  observer = new ResizeObserver(update)
  observer.observe(title)
  update()
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<i18n lang="yaml">
  en:
    deleted: Deleted
    imports: 'No import | {count} import | {count} imports'
    publications: 'No publication | {count} publication | {count} publications'
    errors: '{count} in error'
    importsError: '{count} import in error | {count} imports in error'
    publicationsError: '{count} publication in error | {count} publications in error'
    noError: No error
    noErrorHelp: Imports and publications are up to date.

  fr:
    deleted: Supprimé
    imports: 'Aucun import | {count} import | {count} imports'
    publications: 'Aucune publication | {count} publication | {count} publications'
    errors: '{count} en erreur'
    importsError: '{count} import en erreur | {count} imports en erreur'
    publicationsError: '{count} publication en erreur | {count} publications en erreur'
    noError: Aucune erreur
    noErrorHelp: Les imports et publications sont à jour.

</i18n>

<style scoped>
.catalog-card-logo { flex: none; background: center / contain no-repeat; }
</style>
