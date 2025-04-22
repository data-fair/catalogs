<template>
  <layout-actions-right v-if="$vuetify.display.mdAndUp">
    <slot />
  </layout-actions-right>
  <layout-actions-button v-else>
    <slot />
  </layout-actions-button>
</template>
