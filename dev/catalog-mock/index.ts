import type { CatalogPlugin, CatalogMetadata, CatalogDataset } from '@data-fair/lib-common-types/catalog.js'
import { schema as configSchema, assertValid as assertConfigValid, type Configuration } from './types/config/index.ts'

const listDatasets = async (catalogConfig: Configuration, params?: { q?: string }) => {
  const allDatasets: CatalogDataset[] = [
    {
      id: 'dataset-feline-behavior',
      title: 'Comportements des félins domestiques - MeowCity',
      description: "Le comportement des félins domestiques illustré dans cette étude comporte dix catégories caractérisant :\n\n* des comportements distincts\n* et des aires de jeux préférées. \n\n**Contexte de collecte**\nDécoulant des observations du Plan Félin, la carte des comportements exprime les habitudes des chats dans les espaces à aménager ou à transformer et confirme celles des espaces déjà établis.\n\nInclusives, les catégories de comportements favorisent la diversité et regroupent une variété d'activités pouvant avoir cours dans une même aire de jeu, moyennant des règles de cohabitation que précisent les recommandations adoptées par les propriétaires.\n\n**Méthode de collecte**\nSelon l'approche retenue, les catégories traduisent la nature générale des comportements, s'éloignant ainsi d'une forme d'analyse dont le caractère trop normatif conduirait à une catégorisation inutilement complexe. \n\n**Attributs**\n| Champ | Alias | Type |\n| --- | --- | --- |\n| `categorie` | Catégorie de comportement félin | `varchar` |\n\nPour plus d'informations, consultez [la métadonnée sur le catalogue CatIpsum](https://catipsum.example.com/catalog/feline-data).",
      keywords: [
        'comportement',
        'plan-félin',
        'meow-city',
        'habitudes-des-chats',
        'éthologie'
      ],
      origin: 'https://catipsum.example.com/datasets/feline-behavior',
      private: true,
      resources: [
        {
          id: 'dataset-feline-behavior-csv',
          title: 'Comportements_Felins_2023',
          format: 'csv',
          fileName: 'Comportements_Felins_2023.csv',
          url: 'https://data.catipsum.example.com/datasets/feline/behavior?format=csv',
          mimeType: 'text/csv',
          size: 1234567,
        },
        {
          id: 'dataset-feline-behavior-shapefile',
          title: 'Comportements_Felins_2023',
          format: 'shapefile',
          fileName: 'Comportements_Felins_2023.shp',
          url: 'https://data.catipsum.example.com/datasets/feline/behavior?format=shapefile',
          mimeType: 'application/octet-stream',
          size: 12345678,
        }
      ]
    },
    {
      id: 'dataset-hunting-paths',
      title: 'Parcours de chasse nocturne - MeowCity',
      description: "Ensemble de données contenant les informations géospatiales des tracés des parcours de chasse nocturne des chats domestiques de MeowCity.\n\n**Méthode de collecte**\nLes parcours (tracks.txt) contenus dans le fichier GPS des colliers félins sont disponibles en format shapefile de façon à faciliter l'intégration dans les systèmes d'information géospatiaux (SIG).\n\n**Attributs**\n| Champ | Alias | Type |\n| --- | --- | --- |\n| `cat_id` |  | `long` |\n| `owner_id` |  | `varchar` |\n| `path_short` |  | `long` |\n| `path_long` |  | `varchar` |\n| `path_type` |  | `long` |\n| `path_url` |  | `varchar` |\n| `path_color` |  | `varchar` |\n| `path_text` |  | `long` |\n\nPour plus d'informations, consultez [la métadonnée sur le catalogue CatIpsum](https://catipsum.example.com/catalog/hunting-paths).",
      keywords: [
        'chasse-nocturne',
        'félin',
        'meow-city',
        'comportement'
      ],
      origin: 'https://catipsum.example.com/datasets/hunting-paths',
      resources: [
        {
          id: 'dataset-hunting-paths-csv',
          title: 'Feline_Hunting_Paths',
          format: 'csv',
          url: 'https://data.catipsum.example.com/datasets/hunting/paths?format=csv',
        },
        {
          id: 'dataset-hunting-paths-shapefile',
          title: 'Feline_Hunting_Paths',
          format: 'shapefile',
          url: 'https://data.catipsum.example.com/datasets/hunting/paths?format=shapefile',
          mimeType: 'application/octet-stream'
        },
        {
          id: 'dataset-hunting-paths-geojson',
          title: 'Feline_Hunting_Paths',
          format: 'geojson',
          url: 'https://data.catipsum.example.com/datasets/hunting/paths?format=geojson',
          mimeType: 'application/geo+json'
        }
      ]
    }
  ]

  // Filter datasets based on search query
  let results = allDatasets
  if (params?.q) {
    const searchTerm = params.q.toLowerCase()
    results = allDatasets.filter(dataset =>
      dataset.title.toLowerCase().includes(searchTerm)
    )
  }

  return {
    count: results.length,
    results
  }
}

const getDataset = async (catalogConfig: Configuration, datasetId: string) => {
  return (await listDatasets(catalogConfig)).results.find(d => d.id === datasetId)
}

const publishDataset = async (catalogConfig: Configuration, dataset: any, publication: any) => {
  console.log('Publishing dataset ' + dataset.id)
}

const deleteDataset = async () => {
  // Mock implementation for deleting a dataset
  console.log('Deleting dataset...')
}

const metadata: CatalogMetadata = {
  title: 'Catalog Mock',
  description: 'Mock plugin for Data Fair Catalog',
  icon: 'M6,22A3,3 0 0,1 3,19C3,18.4 3.18,17.84 3.5,17.37L9,7.81V6A1,1 0 0,1 8,5V4A2,2 0 0,1 10,2H14A2,2 0 0,1 16,4V5A1,1 0 0,1 15,6V7.81L20.5,17.37C20.82,17.84 21,18.4 21,19A3,3 0 0,1 18,22H6M5,19A1,1 0 0,0 6,20H18A1,1 0 0,0 19,19C19,18.79 18.93,18.59 18.82,18.43L16.53,14.47L14,17L8.93,11.93L5.18,18.43C5.07,18.59 5,18.79 5,19M13,10A1,1 0 0,0 12,11A1,1 0 0,0 13,12A1,1 0 0,0 14,11A1,1 0 0,0 13,10Z',
  capabilities: [
    'listDatasets',
    'publishDataset'
  ]
}

const plugin: CatalogPlugin = {
  listDatasets,
  getDataset,
  publishDataset,
  deleteDataset,
  configSchema,
  assertConfigValid,
  metadata
}
export default plugin
