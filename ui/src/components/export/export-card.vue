<template>
  <v-card
    :class="$vuetify.theme.current.dark ? 'w-100' : 'w-100 skeleton'"
  >
    <v-card-text>
      <template v-if="exp.catalogId">
        Catalogue : {{ exp.catalogId }}<br>
      </template>
      <template v-if="exp.dataFairDatasetId">
        Jeu de données : {{ exp.dataFairDatasetId }}<br>
      </template>
      Status: {{ exp.status }}
      <template v-if="exp.status === 'error'">
        <br>Erreur : {{ exp.error }}
      </template>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { Export } from '#api/types'

const { exp } = defineProps<{
  exp: Export
}>()

</script>

<i18n lang="yaml">
</i18n>

<style scoped>
</style>
