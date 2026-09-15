<template>
  <v-list-item
    :prepend-avatar="avatarUrl"
    :title="ownerName"
    prepend-gap="20"
  />
  <v-list-item
    :prepend-icon="mdiPencil"
    :title="catalog?.updated.name ?? t('formerUser')"
    :subtitle="dayjs(catalog?.updated.date).format(t('dateFormat'))"
  />
  <v-list-item
    :prepend-icon="mdiPlusCircleOutline"
    :title="catalog?.created.name ?? t('formerUser')"
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
const { departmentLabel } = useDisplayOwner()
const { catalog, plugin } = useCatalogStore()

const ownerName = computed(() => {
  if (!catalog.value) return ''
  const baseName = catalog.value.owner.name || catalog.value.owner.id
  const departmentInfo = departmentLabel(catalog.value.owner.department, catalog.value.owner.departmentName)
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
    formerUser: Former user
  fr:
    dateFormat: 'D MMM YYYY à HH:mm'
    formerUser: Ancien utilisateur
</i18n>

<style scoped>
</style>
