<template>
  <v-list-item
    :prepend-avatar="avatarUrl"
    :title="catalog.owner.name"
  />
  <v-list-item
    :prepend-icon="mdiPencil"
    :title="catalog.updated.name"
    :subtitle="dayjs(catalog.updated.date).format(t('dateFormat'))"
  />
  <v-list-item
    :prepend-icon="mdiPlusCircleOutline"
    :title="catalog.created.name"
    :subtitle="dayjs(catalog.created.date).format(t('dateFormat'))"
  />
  <v-list-item
    :prepend-icon="mdiPuzzle"
    :title="pluginTitle"
  />
</template>

<script setup lang="ts">
import type { Catalog } from '#api/types'

const { dayjs } = useLocaleDayjs()
const { t } = useI18n()

const { catalog, pluginTitle } = defineProps<{
  catalog: Pick<Catalog, 'created' | 'updated' | 'owner' | 'plugin'>
  pluginTitle: string
}>()

const avatarUrl = computed(() => {
  if (catalog.owner.department) return `/simple-directory/api/avatars/${catalog.owner.type}/${catalog.owner.id}/${catalog.owner.department}/avatar.png`
  else return `/simple-directory/api/avatars/${catalog.owner.type}/${catalog.owner.id}/avatar.png`
})

</script>

<i18n lang="yaml">
  en:
    dateFormat: 'D MMM YYYY at HH:mm'
  fr:
    dateFormat: 'D MMM YYYY à HH:mm'
</i18n>

<style scoped>
</style>
