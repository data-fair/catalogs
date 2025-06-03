export default {
  $id: 'https://github.com/data-fair/catalogs/import',
  'x-exports': [
    'types',
    'validate',
    'resolvedSchema'
  ],
  title: 'Import',
  type: 'object',
  additionalProperties: false,
  required: [
    '_id',
    'owner',
    'created',
    'updated',
    'status',
    'catalog',
    'remoteResource',
    'scheduling'
  ],
  properties: {
    _id: {
      type: 'string',
      description: 'Unique identifier for this import',
      readOnly: true
    },
    owner: {
      $ref: 'https://github.com/data-fair/lib/account',
      readOnly: true
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
    updated: {
      type: 'object',
      additionalProperties: false,
      readOnly: true,
      required: [
        'id',
        'name',
        'date'
      ],
      properties: {
        id: {
          type: 'string',
          description: 'Id of the user that last updated this catalog'
        },
        name: {
          type: 'string',
          description: 'Name of the user that last updated this catalog'
        },
        date: {
          type: 'string',
          description: 'Date of the last update for this catalog',
          format: 'date-time'
        }
      }
    },
    config: {
      type: 'object',
      // description: 'Plugin specific configuration for the import',
    },
    status: {
      type: 'string',
      description: 'Status of the import',
      enum: [
        'waiting',
        'running',
        'done',
        'error'
      ],
      default: 'waiting',
      readOnly: true
    },
    catalog: {
      type: 'object',
      additionalProperties: false,
      readOnly: true,
      required: ['id'],
      description: 'The catalog this import belongs to',
      properties: {
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        }
      }
    },
    dataFairDataset: {
      type: 'object',
      additionalProperties: false,
      readOnly: true,
      required: ['id'],
      properties: {
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        }
      }
    },
    remoteResource: {
      type: 'object',
      additionalProperties: false,
      readOnly: true,
      required: ['id'],
      description: 'The remote resource this import belongs to',
      properties: {
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        }
      }
    },
    lastImportDate: {
      type: 'string',
      description: 'Date of the end of the last import process',
      format: 'date-time',
      readOnly: true
    },
    nextImportDate: {
      type: 'string',
      description: 'Date of the next scheduled import',
      format: 'date-time',
      readOnly: true
    },
    scheduling: {
      type: 'array',
      title: 'Scheduling Rules',
      'x-i18n-title': {
        fr: 'Planification de l\'import'
      },
      layout: {
        messages: {
          addItem: 'Add a scheduling rule',
          'x-i18n-addItem': {
            fr: 'Ajouter une règle de planification'
          }
        }
      },
      default: [],
      items: {
        $ref: 'https://github.com/data-fair/catalogs/scheduling'
      }
    },
    error: {
      type: 'string',
      description: 'Error message if the import failed',
      readOnly: true
    }
  },
  layout: { title: null }
}
