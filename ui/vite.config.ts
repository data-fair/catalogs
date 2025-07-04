import path from 'node:path'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'unplugin-vue-router/vite'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Vuetify from 'vite-plugin-vuetify'
import microTemplate from '@data-fair/lib-utils/micro-template.js'
import { autoImports } from '@data-fair/lib-vuetify/vite.js'
import { commonjsDeps } from '@koumoul/vjsf/utils/build.js'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/catalogs',
  build: {
    rollupOptions: {
      output: {
        experimentalMinChunkSize: 2000
      }
    }
  },
  optimizeDeps: { include: ['debug', 'easymde', ...commonjsDeps] },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src/')
    },
  },
  plugins: [
    VueRouter({
      dts: './dts/typed-router.d.ts',
      exclude: process.env.NODE_ENV === 'development' ? [] : ['src/pages/dev.vue']
    }),
    Vue({ template: { compilerOptions: { isCustomElement: (tag) => ['d-frame'].includes(tag) } } }),
    VueI18nPlugin(),
    Vuetify(),
    AutoImport({
      dts: './dts/auto-imports.d.ts',
      vueTemplate: true,
      imports: [
        ...autoImports,
        {
          '~/context': ['$uiConfig', '$sitePath', '$apiPath', '$fetch'],
          '@mdi/js': [
            'mdiAccount',
            'mdiAlert',
            'mdiCodeJson',
            'mdiCog',
            'mdiContentDuplicate',
            'mdiDelete',
            'mdiDotsVertical',
            'mdiDownload',
            'mdiFileDocumentOutline',
            'mdiFileDownload',
            'mdiFileOutline',
            'mdiFilePdfBox',
            'mdiFileTableOutline',
            'mdiFilterMenu',
            'mdiFolder',
            'mdiFolderDownload',
            'mdiHome',
            'mdiLock',
            'mdiLockOpen',
            'mdiMagnify',
            'mdiOpenInNew',
            'mdiPencil',
            'mdiPlusCircle',
            'mdiPlusCircleOutline',
            'mdiPuzzle',
            'mdiUpdate',
            'mdiUpload',
            'mdiZipBox'
          ]
        }
      ],
      dirs: [
        'src/utils',
        'src/composables'
      ]
    }),
    Components({ dts: './dts/components.d.ts' }),
    {
      name: 'inject-site-context',
      async transformIndexHtml (html) {
        // in production this injection will be performed by an express middleware
        if (process.env.NODE_ENV !== 'development') return html
        const { uiConfig } = await import('../api/src/config')
        return microTemplate(html, { SITE_PATH: '', UI_CONFIG: JSON.stringify(uiConfig) })
      }
    }
  ],
  experimental: {
    renderBuiltUrl (filename, { hostType }) {
      if (hostType === 'html') return '{SITE_PATH}/catalogs/' + filename
      return { relative: true }
    }
  },
  server: { hmr: { port: 7200 } }
})
