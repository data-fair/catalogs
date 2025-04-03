<template>
  <v-card
    class="h-100"
    :to="`/catalogs/${catalog._id}`"
  >
    <v-card-item>
      <!-- Owner -->
      <template #append>
        <owner-avatar
          v-if="showOwner"
          :owner="catalog.owner"
        />
      </template>

      <!-- Catalog title -->
      <template #title>
        <span class="font-weight-bold text-primary">
          {{ catalog.title || catalog._id }}
        </span>
        <v-tooltip
          v-if="catalog.title && catalog.title.length > 15"
          activator="parent"
          location="top left"
          open-delay="300"
          :text="catalog.title"
        />
      </template>
    </v-card-item>
    <v-divider v-if="catalog.description" />
    <v-card-text v-if="catalog.description">
      {{ catalog.description }}
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import ownerAvatar from '@data-fair/lib-vuetify/owner-avatar.vue'

const { catalog, showOwner } = defineProps({
  catalog: {
    type: Object,
    default: null
  },
  showOwner: Boolean
})
</script>
