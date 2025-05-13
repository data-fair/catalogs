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
    'catalogId',
    'remoteDatasetId',
    'owner',
    'created'
  ],
  properties: {
    _id: {
      type: 'string',
      description: 'Unique identifier for this import',
      readOnly: true
    },
    status: {
      type: 'string',
      description: 'Status of the import',
      enum: [
        'pending',
        'running',
        'done',
        'error'
      ],
      default: 'pending'
    },
    catalogId: {
      type: 'string',
      description: 'Id of the catalog this import belongs to'
    },
    dataFairDatasetId: {
      type: 'string',
      description: 'Id of the dataset in the local catalog'
    },
    remoteDatasetId: {
      type: 'string',
      description: 'Id of the dataset in the remote catalog'
    },
    remoteResourceId: {
      type: 'string',
      description: 'Id of the resource in the dataset in the remote catalog'
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
          description: 'Id of the user that created this import'
        },
        name: {
          type: 'string',
          description: 'Name of the user that created this import'
        },
        date: {
          type: 'string',
          description: 'Creation date of this import',
          format: 'date-time'
        }
      }
    },
    importedAt: {
      type: 'string',
      description: 'Date of the end of the import process',
      format: 'date-time',
      readOnly: true
    }
  }
}
