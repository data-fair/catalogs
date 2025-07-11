/* eslint-disable no-template-curly-in-string */
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
      title: 'Dataset to update (optional)',
      'x-i18n-title': {
        fr: 'Jeu de données à mettre à jour (optionnel)'
      },
      description: 'You can choose an existing dataset of type **file** or **remote file** to update with this catalog.<br>*A remote dataset will be converted to a simple dataset*<br>You can also leave this field empty to create a new dataset.',
      'x-i18n-description': {
        fr: 'Vous pouvez choisir un jeu de données existant de type **fichier** ou **fichier distant** à mettre à jours avec ce catalogue.<br>*Un jeu de données distant sera converti en jeu de données simple*<br>Vous pouvez aussi laisser ce champ vide pour créer un nouveau jeu de données.'
      },
      additionalProperties: false,
      required: ['id'],
      properties: {
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        }
      },
      layout: {
        getItems: {
          url: '${context.origin}/data-fair/api/v1/datasets?mine=true&raw=true&type=file&select=id,title',
          qSearchParam: 'q',
          itemsResults: 'data.results',
          itemTitle: '`${item.title} (${item.id})`',
          itemKey: 'item.id'
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
        },
        origin: {
          type: 'string',
          description: 'Origin of the remote resource. An url displayed in the UI.'
        }
      }
    },
    nextImportDate: {
      type: 'string',
      description: 'The scheduling date of its next import (transition to the "waiting" status)',
      format: 'date-time',
      readOnly: true
    },
    waitingAt: {
      type: 'string',
      description: 'The date of its transition to the "waiting" status',
      format: 'date-time',
      readOnly: true
    },
    startedAt: {
      type: 'string',
      description: 'The date of its transition to the "running" status',
      format: 'date-time',
      readOnly: true
    },
    finishedAt: {
      type: 'string',
      description: 'The date of its transition to the "error" or "done" status',
      format: 'date-time',
      readOnly: true
    },
    lastImportDate: {
      type: 'string',
      description: 'The date of its last successful import (transition to the "done" status)',
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
    logs: {
      type: 'array',
      description: 'Logs of the last import process',
      items: {
        $ref: 'https://github.com/data-fair/types-catalogs/log'
      },
      readOnly: true
    }
  },
  layout: { title: null }
}
