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
    'status',
    'catalogId',
    'remoteDatasetId'
  ],
  properties: {
    _id: {
      type: 'string',
      description: 'Unique identifier for this import'
    },
    owner: {
      $ref: 'https://github.com/data-fair/lib/account'
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
    lastImportDate: {
      type: 'string',
      description: 'Date of the end of the import process',
      format: 'date-time'
    }
  }
}
