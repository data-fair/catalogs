<template>
  <v-list-item
    :prepend-avatar="avatarUrl"
    :title="ownerName"
  />
  <v-list-item
    :prepend-icon="mdiPencil"
    :title="catalog?.updated.name"
    :subtitle="dayjs(catalog?.updated.date).format(t('dateFormat'))"
  />
  <v-list-item
    :prepend-icon="mdiPlusCircleOutline"
    :title="catalog?.created.name"
    :subtitle="dayjs(catalog?.created.date).format(t('dateFormat'))"
  />
  <v-list-item
    :prepend-icon="mdiPuzzle"
    :title="plugin?.metadata.title"
  />
</template>

<script setup lang="ts">

const { dayjs } = useLocaleDayjs()
const { t } = useI18n()
const { catalog, plugin } = useCatalogStore()

const ownerName = computed(() => {
  if (!catalog.value) return ''
  const baseName = catalog.value.owner.name || catalog.value.owner.id
  const departmentInfo = catalog.value.owner.departmentName || catalog.value.owner.department
  return departmentInfo
    ? `${baseName} - ${departmentInfo}`
    : baseName
})
const avatarUrl = computed(() => {
  if (catalog.value?.owner.department) return `/simple-directory/api/avatars/${catalog.value?.owner.type}/${catalog.value?.owner.id}/${catalog.value?.owner.department}/avatar.png`
  else return `/simple-directory/api/avatars/${catalog.value?.owner.type}/${catalog.value?.owner.id}/avatar.png`
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
