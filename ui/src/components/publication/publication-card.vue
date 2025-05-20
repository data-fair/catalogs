<template>
  <v-card
    :class="$vuetify.theme.current.dark ? 'w-100' : 'w-100 skeleton'"
  >
    <v-card-text>
      Catalogue : {{ publication.catalog.title }}<br>
      Jeu de données : {{ publication.dataFairDataset.title }}<br>
      Status: {{ publication.status }}
      <template v-if="publication.status === 'error'">
        <br>Erreur : {{ publication.error }}
      </template>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { Publication } from '#api/types'

const { publication } = defineProps<{
  publication: Publication
}>()

</script>

<i18n lang="yaml">
</i18n>

<style scoped>
</style>
