export default {
  $id: 'https://github.com/data-fair/types-catalogs/metadata',
  'x-exports': ['types'],
  type: 'object',
  title: 'Metadata',
  description: 'The metadata of the catalog plugin',
  required: ['title', 'capabilities'],
  additionalProperties: false,
  properties: {
    title: {
      description: 'The title of the plugin to be displayed in the UI (e.g., "UData", "Mock", etc.)',
      type: 'string'
    },
    description: {
      description: 'The default description of the plugin to be displayed in the UI. Prefer using localized descriptions in the i18n object.',
      type: 'string'
    },
    capabilities: {
      description: 'The list of capabilities that a catalog can have.',
      type: 'array',
      items: {
        $ref: 'https://github.com/data-fair/types-catalogs/capability'
      }
    },
    thumbnailPath: {
      description: 'Optional path of the thumbnail image from the root of the plugin to be displayed in the UI.',
      type: 'string',
    },
    i18n: {
      type: 'object',
      description: 'Optional i18n translations for the plugin. When provided, they override the default translations.',
      additionalProperties: {
        type: 'object',
        additionalProperties: false,
        properties: {
          description: {
            type: 'string',
            description: 'The translated description of the plugin to be displayed in the UI. When provided, this is used instead of the default description property.'
          },
          actionLabels: {
            type: 'object',
            description: 'Labels describing the possible publication actions. Used to explain what the user can do when configuring a publication.',
            additionalProperties: false,
            properties: {
              createFolderInRoot: {
                type: 'string',
                description: 'Label for the action "Create folder in root".'
              },
              createFolder: {
                type: 'string',
                description: 'Label for the action "Create folder".'
              },
              createResource: {
                type: 'string',
                description: 'Label for the action "Create resource".'
              },
              replaceFolder: {
                type: 'string',
                description: 'Label for the action "Replace folder".'
              },
              replaceResource: {
                type: 'string',
                description: 'Label for the action "Replace resource".'
              }
            }
          },
          actionButtons: {
            type: 'object',
            description: 'Labels for the buttons that trigger the selected publication action. The text changes depending on the chosen action.',
            additionalProperties: false,
            properties: {
              createFolderInRoot: {
                type: 'string',
                description: 'Button label for creating a publication in the root folder. Default: "Create publication".'
              },
              createFolder: {
                type: 'string',
                description: 'Button label for creating a folder in the selected folder. Default: "Create publication here".'
              },
              createResource: {
                type: 'string',
                description: 'Button label for creating a resource in the selected folder. Default: "Create publication here".'
              },
              replaceFolder: {
                type: 'string',
                description: 'Button label for replacing the selected folder with a new publication. Default: "Replace this folder".'
              },
              replaceResource: {
                type: 'string',
                description: 'Button label for replacing the selected resource with a new publication. Default: "Replace this resource".'
              }
            }
          },
          stepTitles: {
            type: 'object',
            description: 'Titles for the steps in the publication wizard. Used when the process requires selecting a folder or resource (all modes except "Create in root").',
            additionalProperties: false,
            properties: {
              createFolder: {
                type: 'string',
                description: 'Title of the step where the user selects the destination folder for the publication. Default: "Destination folder selection".'
              },
              createResource: {
                type: 'string',
                description: 'Title of the step where the user selects the destination folder for the publication. Default: "Destination folder selection".'
              },
              replaceFolder: {
                type: 'string',
                description: 'Title of the step where the user selects a folder to replace with the publication. Default: "Folder to replace selection".'
              },
              replaceResource: {
                type: 'string',
                description: 'Title of the step where the user selects a resource to replace with the publication. Default: "Resource to replace selection".'
              }
            }
          }
        }
      }
    }
  }
}
