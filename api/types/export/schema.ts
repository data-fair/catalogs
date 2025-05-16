export default {
  $id: 'https://github.com/data-fair/catalogs/export',
  'x-exports': [
    'types',
    'validate',
    'resolvedSchema'
  ],
  title: 'Export',
  type: 'object',
  additionalProperties: false,
  required: [
    '_id',
    'owner',
    'created',
    'status',
    'action',
    'catalogId',
    'dataFairDatasetId'
  ],
  properties: {
    _id: {
      type: 'string',
      description: 'Unique identifier for this export'
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
      description: 'Status of the export',
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
    catalogId: {
      type: 'string',
      title: 'Catalog',
      'x-i18n-title': {
        fr: 'Catalogue'
      },
      layout: {
        if: {
          expr: '!context.catalogId',
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
          // eslint-disable-next-line no-template-curly-in-string
          url: '${context.origin}/catalogs/api/catalogs?sort=updated.date:-1&select=_id,title',
          itemsResults: 'data.results',
          itemTitle: 'item.title',
          itemValue: 'item._id',
          qSearchParam: 'q',
        }
      }
    },
    dataFairDatasetId: {
      type: 'string',
      title: 'Local dataset',
      'x-i18n-title': {
        fr: 'Jeu de données local'
      },
      layout: {
        if: {
          expr: '!context.dataFairDatasetId',
          pure: false
        },
        props: {
          placeholder: 'Search for a dataset',
          'x-i18n-placeholder': {
            fr: 'Rechercher...'
          }
        },
        getItems: {
          // eslint-disable-next-line no-template-curly-in-string
          url: '${context.origin}/data-fair/api/v1/datasets?raw=true&select=id,title',
          itemsResults: 'data.results',
          itemTitle: 'item.title',
          itemValue: 'item.id',
          qSearchParam: 'q'
        }
      }
    },
    remoteDatasetId: {
      type: 'string',
      title: 'Remote dataset',
      'x-i18n-title': {
        fr: 'Jeu de données distant'
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
          // eslint-disable-next-line no-template-curly-in-string
          url: '${context.origin}/catalogs/api/catalogs/${rootData.catalogId}/datasets',
          itemsResults: 'data.results',
          itemTitle: 'item.title',
          itemValue: 'item.id',
          qSearchParam: 'q'
        }
      }
    },
    remoteResourceId: {
      type: 'string',
      description: 'Id of the resource in the dataset in the remote catalog'
    },
    lastExportDate: {
      type: 'string',
      description: 'Date of the end of the export process',
      format: 'date-time'
    }
  },
  layout: {
    title: null,
    children: [
      'catalogId',
      'dataFairDatasetId',
      'action',
      'remoteDatasetId'
    ],
    cols: 6
  }
}
