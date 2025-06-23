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
    'capabilities',
    'owner',
    'config',
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
      layout: 'textarea'
    },
    deletionRequested: {
      type: 'boolean',
      description: 'If true, the catalog is marked for deletion and will be deleted after all publications are deleted',
      default: false,
      readOnly: true
    },
    plugin: {
      type: 'string',
      readOnly: true
    },
    capabilities: {
      type: 'array',
      description: 'Capabilities of this catalog, deduplicated from the plugin',
      items: {
        $ref: 'https://github.com/data-fair/lib/catalog#/$defs/capability',
      },
      readOnly: true
    },
    owner: {
      $ref: 'https://github.com/data-fair/lib/account',
      readOnly: true
    },
    config: {
      type: 'object',
      description: 'Plugin-specific configuration : this content varies dewaiting on the used plugin'
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
      [
        {
          children: [
            'title',
            'description',
          ],
          cols: 8,
        },
        {
          name: 'activity',
          cols: 4,
        }
      ],
      'config'
    ]
  }
}
