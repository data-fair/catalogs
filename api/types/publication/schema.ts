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
        'create',
        'addAsResource',
        'overwrite',
        'delete'
      ],
      layout: {
        cols: 6,
        items: [
          {
            title: 'Create a new dataset',
            'x-i18n-title': {
              fr: 'Créer un nouveau jeu de données'
            },
            value: 'create'
          },
          {
            title: 'Add as resource to an existing dataset',
            'x-i18n-title': {
              fr: 'Ajouter comme ressource à un jeu de données existant'
            },
            value: 'addAsResource'
          },
          {
            title: 'Overwrite an existing dataset',
            'x-i18n-title': {
              fr: 'Écraser un jeu de données existant'
            },
            value: 'overwrite'
          }
          // Do not show delete option in the form
        ]
      }
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
      },
      layout: {
        cols: 6,
        if: {
          expr: '!context.catalog.id',
          pure: false
        },
        props: {
          placeholder: 'Search for a catalog',
          'x-i18n-placeholder': {
            fr: 'Rechercher...'
          }
        },
        getItems: {
          // TODO: Filter by catalogs that have the capability to publish
          url: '${context.origin}/catalogs/api/catalogs?sort=updated.date:-1&select=_id,title',
          itemsResults: 'data.results',
          itemTitle: 'item.title',
          itemValue: '{ id: item._id, title: item.title }',
          itemKey: 'item.id',
          qSearchParam: 'q',
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
        if: {
          expr: '!context.dataFairDataset.id',
          pure: false
        },
        props: {
          placeholder: 'Search for a dataset',
          'x-i18n-placeholder': {
            fr: 'Rechercher...'
          }
        },
        getItems: {
          url: '${context.origin}/data-fair/api/v1/datasets?raw=true&select=id,title&mine=true',
          itemsResults: 'data.results',
          itemTitle: '`${item.title} (${item.id})`',
          itemKey: 'item.id',
          qSearchParam: 'q'
        }
      }
    },
    remoteDataset: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      title: 'Remote dataset',
      'x-i18n-title': {
        fr: 'Jeu de données distant'
      },
      properties: {
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        },
        url: {
          type: 'string',
          description: 'URL to view the dataset in the remote catalog'
        }
      },
      layout: {
        if: {
          expr: "parent.data.action === 'addAsResource' || parent.data.action === 'overwrite'",
          pure: false
        },
        props: {
          placeholder: 'Search in the remote catalog...',
          'x-i18n-placeholder': {
            fr: 'Rechercher dans le catalogue distant...'
          }
        },
        getItems: {
          url: '${context.origin}/catalogs/api/catalogs/${rootData.catalog.id}/resources',
          itemsResults: 'data.results',
          itemTitle: 'item.title',
          itemValue: '{ id: item.id, title: item.title }',
          qSearchParam: 'q'
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
          description: 'URL to view the resource in the remote catalog'
        }
      }
    },
    lastPublicationDate: {
      type: 'string',
      description: 'Date of the end of the last publication process',
      format: 'date-time'
    },
    error: {
      type: 'string',
      description: 'Error message if the publication failed'
    }
  },
  layout: {
    title: null,
    children: [
      'catalog',
      'dataFairDataset',
      'action',
      'remoteDataset'
    ]
  }
}
