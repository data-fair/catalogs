<template>
  <v-expansion-panels class="px-1 mb-4">
    <v-expansion-panel
      color="primary"
      static
      :title="t('createNewImport')"
      :expand-icon="mdiPlusCircle"
    >
      <v-expansion-panel-text>
        <import-new
          :catalog="catalog"
          @on-publish="importsFetch.refresh()"
        />
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>

  <v-row
    v-if="importsFetch.loading.value"
    class="d-flex align-stretch"
  >
    <v-col
      v-for="i in 4"
      :key="i"
      md="4"
      sm="6"
      cols="12"
      class="d-flex"
    >
      <v-skeleton-loader
        :class="$vuetify.theme.current.dark ? 'w-100' : 'w-100 skeleton'"
        type="heading"
      />
    </v-col>
  </v-row>
  <span
    v-else-if="!importsFetch.data.value?.results.length"
    class="d-flex justify-center text-h6"
  >
    {{ t('noImports') }}
  </span>
  <template v-else>
    <h3 class="text-h5">
      {{ t('nbImports', importsFetch.data.value?.results.length || 0) }}
    </h3>
    <v-row class="d-flex align-stretch">
      <v-col
        v-for="imp in importsFetch.data.value?.results"
        :key="imp._id"
        md="4"
        sm="6"
        cols="12"
      >
        <import-card
          :imp="imp"
          @on-delete="importsFetch.refresh()"
        />
      </v-col>
    </v-row>
  </template>
</template>

<script setup lang="ts">
import type { Import, Plugin } from '#api/types'

const { t } = useI18n()

// Used to filter the imports
const { catalog } = defineProps<{
  catalog: {
    id: string
    title?: string
  },
  plugin?: Plugin
}>()

const importsFetch = useFetch<{ results: Import[] }>(`${$apiPath}/imports`, {
  query: {
    catalogId: catalog.id
  }
})

</script>

<i18n lang="yaml">
  en:
    createNewImport: Create a new import
    nbImports: '{count} import | {count} imports'
    noImports: This catalog does not contain any imports

  fr:
    createNewImport: Importer un nouveau jeu de données
    nbImports: '{count} import | {count} imports'
    noImports: Ce catalogue ne contient pas encore d'import

</i18n>

<style scoped>
:deep(.v-expansion-panel-text__wrapper) {
  padding: 0;
}
</style>
