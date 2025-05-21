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
    'status',
    'catalog',
    'remoteDataset'
  ],
  properties: {
    _id: {
      type: 'string',
      description: 'Unique identifier for this import'
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
      description: 'Status of the import',
      enum: [
        'waiting',
        'running',
        'done',
        'error'
      ],
      default: 'waiting'
    },
    catalog: {
      type: 'object',
      additionalProperties: false,
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
    remoteDataset: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      description: 'The remote dataset this import belongs to',
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
      format: 'date-time'
    }
  }
}
