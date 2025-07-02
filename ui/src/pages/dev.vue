<template>
  <v-app-bar
    flat
    dense
    class="px-0 main-app-bar"
  >
    <v-toolbar-items>
      <v-btn
        variant="text"
        href="/catalogs/catalogs"
      >
        Catalogues
      </v-btn>
      <v-btn
        variant="text"
        href="/catalogs/admin/plugins"
        color="admin"
      >
        Plugins
      </v-btn>
      <v-btn
        variant="text"
        target="_blank"
        href="/simple-directory"
        color="primary"
      >
        Simple Directory
      </v-btn>
      <v-btn
        variant="text"
        target="_blank"
        href="/data-fair"
        color="primary"
      >
        Data Fair
      </v-btn>
    </v-toolbar-items>
    <v-spacer />
    <v-toolbar-items>
      <v-btn
        v-if="!session.state.user?.adminMode"
        variant="text"
        :href="url"
        color="admin"
      >
        Se connecter (Super Admin)
      </v-btn>
    </v-toolbar-items>
    <personal-menu />
  </v-app-bar>
</template>

<script setup>
import personalMenu from '@data-fair/lib-vuetify/personal-menu.vue'

const session = useSession()
const url = `${$sitePath}/simple-directory/login?redirect=${encodeURIComponent(window.location.href)}&adminMode=true`
</script>

<style scoped>
</style>
