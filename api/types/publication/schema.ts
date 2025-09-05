/* eslint-disable no-template-curly-in-string */
export default {
  $id: 'https://github.com/data-fair/catalogs/publication',
  'x-exports': [
    'types',
    'validate',
    'resolvedSchema'
  ],
  title: 'Publication',
  type: 'object',
  additionalProperties: false,
  required: [
    '_id',
    'owner',
    'created',
    'status',
    'action',
    'publicationSite',
    'catalog',
    'dataFairDataset'
  ],
  properties: {
    _id: {
      type: 'string',
      description: 'Unique identifier for this publication'
    },
    owner: {
      $ref: 'https://github.com/data-fair/lib/account'
    },
    catalog: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      title: 'Catalog',
      'x-i18n-title': {
        fr: 'Catalogue'
      },
      properties: {
        id: {
          type: 'string',
          description: 'Id of the catalog'
        },
        title: {
          type: 'string',
          description: 'Title of the catalog'
        }
      }
    },
    created: {
      type: 'object',
      additionalProperties: false,
      required: [
        'id',
        'name',
        'date'
      ],
      readOnly: true,
      properties: {
        id: {
          type: 'string',
          description: 'Id of the user that created this catalog'
        },
        name: {
          type: 'string',
          description: 'Name of the user that created this catalog'
        },
        date: {
          type: 'string',
          description: 'Creation date of this catalog',
          format: 'date-time'
        }
      }
    },
    status: {
      type: 'string',
      description: 'Status of the publication',
      enum: [
        'waiting',
        'running',
        'done',
        'error'
      ],
      default: 'waiting'
    },
    action: {
      type: 'string',
      title: 'Action to perform in the remote catalog',
      'x-i18n-title': {
        fr: 'Action à effectuer dans le catalogue distant'
      },
      enum: [
        'createFolderInRoot',
        'createFolder',
        'createResource',
        'replaceFolder',
        'replaceResource',
        'delete'
      ],
      layout: { cols: 6 }
    },
    publicationSite: {
      type: 'object',
      title: 'Publication Site',
      'x-i18n-title': {
        fr: 'Site de publication'
      },
      description: 'The site where the user will be redirected from the remote dataset.',
      'x-i18n-description': {
        fr: 'Le site sur lequel sera redirigé l\'utilisateur depuis le jeu de données distant.'
      },
      required: ['title', 'url', 'datasetUrlTemplate'],
      properties: {
        title: {
          type: 'string',
          description: 'Title of the publication site'
        },
        url: {
          type: 'string',
          description: 'URL of the publication site'
        },
        datasetUrlTemplate: {
          type: 'string',
          description: 'Template for the URL to view the dataset in the publication site, using micro-template syntax.',
        }
      },
      additionalProperties: false,
      layout: {
        getItems: {
          url: '${context.origin}/data-fair/api/v1/datasets/${rootData.dataFairDataset?.id}?select=publicationSites',
          itemsResults: 'data.publicationSites ?? []',
          itemValue: 'context.publicationSites[item]',
          itemTitle: '`${context.publicationSites[item]?.title} (${context.publicationSites[item]?.url})`',
        },
        props: {
          noDataText: 'This dataset is not published on any site, you cannot publish it to a catalog.',
          'x-i18n-no-data-text': {
            fr: 'Ce jeu de données n\'est publié sur aucun site, vous ne pouvez donc pas le publier sur un catalogue.'
          }
        }
      }
    },
    dataFairDataset: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      title: 'Data Fair dataset',
      'x-i18n-title': {
        fr: 'Jeu de données Data Fair'
      },
      properties: {
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        }
      },
      layout: {
        cols: 6,
        props: {
          placeholder: 'Search for a dataset',
          'x-i18n-placeholder': {
            fr: 'Rechercher...'
          }
        },
        getItems: {
          url: '${context.origin}/data-fair/api/v1/datasets?raw=true&select=id,title&owner=${context.ownerFilter}',
          itemsResults: 'data.results',
          itemTitle: '`${item.title} (${item.id})`',
          itemKey: 'item.id',
          qSearchParam: 'q'
        }
      }
    },
    remoteFolder: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      properties: {
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        },
        url: {
          type: 'string',
          description: 'URL to view the folder in the remote catalog (if available)'
        }
      }
    },
    remoteResource: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      properties: {
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        },
        url: {
          type: 'string',
          description: 'URL to view the resource in the remote catalog (if available)'
        }
      }
    },
    startedAt: {
      type: 'string',
      description: 'The date of its transition to the "running" status',
      format: 'date-time',
      readOnly: true
    },
    lastPublicationDate: {
      type: 'string',
      description: 'The date of its last successful publication (transition to the "done" status)',
      format: 'date-time',
      readOnly: true
    },
    logs: {
      type: 'array',
      description: 'Logs of the last publication process',
      items: {
        $ref: 'https://github.com/data-fair/types-catalogs/log'
      },
      readOnly: true
    }
  },
  layout: {
    title: null,
    children: [
      'dataFairDataset',
      'action',
      'publicationSite'
    ]
  }
}
