<template>
  <v-container data-iframe-height>
    <v-alert
      density="compact"
      type="error"
      variant="outlined"
      :title
      :text
      border
    />
  </v-container>
</template>

<script setup lang="ts">

const { title, text } = defineProps({
  title: {
    type: String,
    default: undefined,
  },
  text: {
    type: String,
    default: undefined,
  },
})

</script>

<i18n lang="yaml">
</i18n>

<style scoped>
</style>
