<template>
  <v-sheet
    class="mb-4"
    elevation="1"
    width="100%"
    rounded
  >
    <v-row no-gutters>
      <v-col
        v-if="mdAndUp"
        cols="2"
        class="d-flex align-center"
      >
        <v-img
          :src="src"
          height="100"
        />
      </v-col>
      <v-col
        cols="auto"
        :class="mdAndUp ? '' : 'mx-4'"
      >
        <h3 class="text-h5 my-2">
          {{ title }}
        </h3>
        <p
          v-if="description"
          class="my-2"
        >
          {{ description }}
        </p>
        <v-tabs
          v-if="tabs"
          v-model="activeTab"
        >
          <v-tab
            v-for="tab in tabs"
            :key="tab.id"
            :value="tab.id"
            :text="tab.title"
            :prepend-icon="tab.icon"
            color="primary"
          />
        </v-tabs>
      </v-col>
    </v-row>
  </v-sheet>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'

const { title, description, src, tabs } = defineProps<{
  title: string
  description?: string
  src?: string
  tabs?: {
    id: string
    title: string
    icon: string
  }[]
}>()

const { mdAndUp } = useDisplay()
const activeTab = defineModel<string>()

</script>

<i18n lang="yaml">
</i18n>

<style scoped>
</style>
