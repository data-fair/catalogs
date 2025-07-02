<template>
  <v-list
    data-iframe-height
    density="compact"
    style="background-color: transparent;"
  >
    <v-list-item
      :to="`/catalogs/${route.params.catalogId}/imports/new`"
      rounded
    >
      <template #prepend>
        <v-icon
          color="primary"
          :icon="mdiPlusCircle"
        />
      </template>
      {{ t('createNewImport') }}
    </v-list-item>
  </v-list>
</template>

<script setup lang="ts">

const { t } = useI18n()
const route = useRoute<'/catalogs/[catalogId]/'>()

</script>

<i18n lang="yaml">
  en:
    createNewImport: Create new import

  fr:
    createNewImport: Créer un nouvel import

</i18n>

<style scoped>
</style>
