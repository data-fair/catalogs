<template>
  <v-list-item
    :prepend-avatar="avatarUrl"
    :title="resource.owner.name"
  />
  <v-list-item
    :prepend-icon="mdiPencil"
    :title="`${resource.updated.name}`"
    :subtitle="`${dayjs(resource.updated.date).format(t('dateFormat'))}`"
  />
  <v-list-item
    :prepend-icon="mdiPlusCircleOutline"
    :title="`${resource.created.name}`"
    :subtitle="`${dayjs(resource.created.date).format(t('dateFormat'))}`"
  />
</template>

<script setup lang="ts">
import type { Catalog } from '#api/types'

const { dayjs } = useLocaleDayjs()
const { t } = useI18n()

const { resource } = defineProps<{
  resource: Pick<Catalog, 'created' | 'updated' | 'owner'>
}>()

const avatarUrl = computed(() => {
  if (resource.owner.department) return `/simple-directory/api/avatars/${resource.owner.type}/${resource.owner.id}/${resource.owner.department}/avatar.png`
  else return `/simple-directory/api/avatars/${resource.owner.type}/${resource.owner.id}/avatar.png`
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
