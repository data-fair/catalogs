<template data-iframe-height>
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
    v-else-if="!importsFetch.data.value?.count"
    class="d-flex justify-center text-h6"
  >
    {{ t('noImports') }}
  </span>
  <template v-else-if="importsFetch.data.value">
    <h3 class="text-h5 mb-4">
      {{ t('nbImports', importsFetch.data.value.count) }}
    </h3>
    <v-row class="d-flex align-stretch">
      <v-col
        v-for="imp in importsFetch.data.value.results"
        :key="imp._id"
        md="4"
        sm="6"
        cols="12"
      >
        <import-card :imp="imp" />
      </v-col>
    </v-row>
  </template>
</template>

<script setup lang="ts">
import type { Import } from '#api/types'

const { catalogId } = defineProps<{
  catalogId: string
}>()

const { t } = useI18n()
const importsFetch = useFetch<{ results: Import[], count: number }>(`${$apiPath}/imports`, {
  query: { catalogId }
})

</script>

<i18n lang="yaml">
  en:
    nbImports: '{count} import | {count} imports'
    noImports: This catalog does not contain any imports

  fr:
    nbImports: '{count} import | {count} imports'
    noImports: Ce catalogue ne contient pas encore d'import

</i18n>

<style scoped>
:deep(.v-expansion-panel-text__wrapper) {
  padding: 0;
}
</style>
