export default {
  $id: 'https://github.com/data-fair/types-catalogs/resource',
  'x-exports': ['types'],
  type: 'object',
  title: 'Resource',
  description: 'The normalized resource to import from a remote catalog to Data Fair',
  required: ['id', 'title', 'filePath', 'format'],
  additionalProperties: false,
  properties: {
    id: {
      type: 'string',
      description: 'The unique identifier of the resource, independent of the folder it is in'
    },
    title: {
      type: 'string',
      description: 'The title of the resource'
    },
    description: {
      type: 'string',
    },
    filePath: {
      type: 'string',
      description: 'The path to the downloaded resource file.',
    },
    format: {
      type: 'string',
      description: 'The format of the resource, e.g. csv, json, xml, etc. It is displayed in the UI of catalogs.',
    },
    // https://www.w3.org/TR/vocab-dcat-2/#Property:dataset_frequency and https://www.dublincore.org/specifications/dublin-core/collection-description/frequency/
    frequency: {
      type: 'string',
      description: 'The frequency of the resource updates, if available. It can be one of the following values: triennial, biennial, annual, semiannual, threeTimesAYear, quarterly, bimonthly, monthly, semimonthly, biweekly, threeTimesAMonth, weekly, semiweekly, threeTimesAWeek, daily, continuous or irregular.',
      enum: ['', 'triennial', 'biennial', 'annual', 'semiannual', 'threeTimesAYear', 'quarterly', 'bimonthly', 'monthly', 'semimonthly', 'biweekly', 'threeTimesAMonth', 'weekly', 'semiweekly', 'threeTimesAWeek', 'daily', 'continuous', 'irregular']
    },
    image: {
      type: 'string',
      description: 'The URL of the image representing the resource, if available'
    },
    license: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'href'],
      properties: {
        title: {
          type: 'string',
          description: 'Short title for the license'
        },
        href: {
          type: 'string',
          description: 'The URL where the license can be read'
        }
      }
    },
    keywords: {
      type: 'array',
      description: 'The list of keywords associated with the resource, if available',
      items: {
        type: 'string'
      }
    },
    mimeType: {
      type: 'string',
      description: 'The Mime type of the resource, if available'
    },
    origin: {
      type: 'string',
      description: 'The URL where the original data can be found'
    },
    schema: {
      type: 'array',
      description: 'JSON schema properties of the fields in the file',
      items: {
        type: 'object',
        additionalProperties: true,
      }
    },
    size: {
      type: 'number',
      description: 'The size of the resource in bytes, if available. It is displayed in the UI of catalogs.'
    },
    topics: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title'],
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          color: { type: 'string' },
          icon: { type: 'object' }
        }
      }
    }
  }
}
