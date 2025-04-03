import type { CatalogPlugin } from '@data-fair/lib-common-types/catalog.js'
import { schema as configSchema, assertValid as assertConfigValid } from './types/config/index.ts'

export const listDatasets = async () => {
  return {
    count: 2,
    results: [
      {
        title: 'opendata.staging-koumoul.com',
        owner: {
          type: 'organization',
          id: 'jxKDdH3lR',
          name: 'Koumoul'
        },
        id: 'opendatastaging-koumoulcomdata-fairapiv1catalogdcat',
        userPermissions: [
          'list',
          'readDescription',
          'readApiDoc',
          'writeDescription',
          'delete',
          'getPermissions',
          'setPermissions',
          'readDatasets',
          'harvestDataset',
          'harvestDatasetResource'
        ],
        public: false,
        href: 'null/api/v1/catalogs/undefined',
        page: 'https://staging-koumoul.com/data-fair/catalog/opendatastaging-koumoulcomdata-fairapiv1catalogdcat',
        autoUpdate: {
          active: false
        }
      },
      {
        title: 'sig.grandpoitiers.fr esri 2',
        owner: {
          type: 'organization',
          id: 'jxKDdH3lR',
          name: 'Koumoul'
        },
        id: 'siggrandpoitiersfrarcgis2restservices',
        userPermissions: [
          'list',
          'readDescription',
          'readApiDoc',
          'writeDescription',
          'delete',
          'getPermissions',
          'setPermissions',
          'readDatasets',
          'harvestDataset',
          'harvestDatasetResource'
        ],
        public: false,
        href: 'null/api/v1/catalogs/undefined',
        page: 'https://staging-koumoul.com/data-fair/catalog/siggrandpoitiersfrarcgis2restservices',
        autoUpdate: {
          active: false
        }
      }
    ]
  }
}

export const metadata = {
  title: 'Catalog Mock',
  description: 'Mock plugin for Data Fair Catalog',
  icon: 'M6,22A3,3 0 0,1 3,19C3,18.4 3.18,17.84 3.5,17.37L9,7.81V6A1,1 0 0,1 8,5V4A2,2 0 0,1 10,2H14A2,2 0 0,1 16,4V5A1,1 0 0,1 15,6V7.81L20.5,17.37C20.82,17.84 21,18.4 21,19A3,3 0 0,1 18,22H6M5,19A1,1 0 0,0 6,20H18A1,1 0 0,0 19,19C19,18.79 18.93,18.59 18.82,18.43L16.53,14.47L14,17L8.93,11.93L5.18,18.43C5.07,18.59 5,18.79 5,19M13,10A1,1 0 0,0 12,11A1,1 0 0,0 13,12A1,1 0 0,0 14,11A1,1 0 0,0 13,10Z'
}

export { configSchema }
export { assertConfigValid }

export default {
  listDatasets,
  configSchema,
  assertConfigValid,
  metadata
} as CatalogPlugin
