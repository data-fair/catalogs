export default {
  $id: 'https://github.com/data-fair/catalogs/catalog',
  'x-exports': [
    'types',
    'validate',
    'resolvedSchema'
  ],
  title: 'Catalog',
  type: 'object',
  additionalProperties: false,
  required: [
    '_id',
    'title',
    'plugin',
    'owner',
    'config',
    'datasets',
    'created',
    'updated'
  ],
  properties: {
    _id: {
      type: 'string',
      description: 'Unique identifier for this catalog',
      readOnly: true
    },
    title: {
      type: 'string',
      title: 'Title',
      'x-i18n-title': {
        fr: 'Titre'
      },
      minLength: 3,
      maxLength: 75,
      default: ''
    },
    description: {
      type: 'string',
      title: 'Description',
      'x-i18n-title': {
        fr: 'Description'
      },
      description: 'A free text area to write comments about the catalog',
      'x-i18n-description': {
        fr: 'Une zone de texte libre pour écrire des commentaires sur le catalogue'
      },
      layout: 'markdown'
    },
    plugin: {
      type: 'string',
      readOnly: true
    },
    owner: {
      $ref: 'https://github.com/data-fair/lib/account'
    },
    config: {
      type: 'object',
      description: 'Plugin-specific configuration : this content varies depending on the used plugin'
    },
    datasets: {
      type: 'array',
      description: 'List of data-fair datasets imported or exported by this catalog',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id',
          'dataFairId',
          'title'
        ],
        properties: {
          id: {
            type: 'string',
            description: 'Id of the dataset in the catalog'
          },
          dataFairId: {
            type: 'string',
            description: 'Data-fair dataset identifier'
          },
          title: {
            type: 'string'
          }
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
    }
  },
  layout: {
    title: null,
    children: [
      {
        children: [
          'title',
          'description',
        ],
        cols: 8,
      },
      'config',
    ]
  }
}
