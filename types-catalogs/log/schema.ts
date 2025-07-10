export default {
  $id: 'https://github.com/data-fair/types-catalogs/log',
  type: 'object',
  title: 'Log',
  description: 'Log entry schema for import or publication processes.',
  additionalProperties: false,
  required: ['type', 'date', 'msg'],
  properties: {
    type: {
      type: 'string',
      enum: ['info', 'warning', 'error', 'step', 'task'],
      description: 'Type of the log entry.'
    },
    date: {
      type: 'string',
      format: 'date-time',
      description: 'The date and time when the log entry was created.'
    },
    msg: {
      type: 'string',
      description: 'The message to log.'
    },
    extra: {
      // no type defined, can be any additional information
      description: 'Additional information about the log entry.',
    },
    key: {
      type: 'string',
      description: 'The identifier for the task, used when updating progress.'
    },
    progress: {
      type: 'number',
      description: 'Current progress of the task, starting at 0.'
    },
    total: {
      type: 'number',
      description: 'Maximum value the progress can reach.'
    },
    progressDate: {
      type: 'string',
      format: 'date-time',
      description: 'The date and time when the progress was last updated.'
    }
  }
}
