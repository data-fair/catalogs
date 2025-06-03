export default {
  $id: 'https://github.com/data-fair/catalogs/scheduling',
  'x-exports': ['types'],
  title: 'Scheduling',
  type: 'object',
  required: ['type', 'month', 'dayOfWeek', 'dayOfMonth', 'hour', 'minute', 'timeZone'],
  // Empty data when we select another oneOf option
  oneOfLayout: {
    emptyData: true,
  },
  oneOf: [
    {
      title: 'Mensuel',
      properties: {
        type: { const: 'monthly' },
        month: { const: '*' },
        dayOfWeek: { const: '*' },
        dayOfMonth: {
          title: 'Day of the Month',
          'x-i18n-title': {
            fr: 'Jour du mois'
          },
          type: 'integer',
          minimum: 1,
          maximum: 28,
          default: 1
        },
        hour: {
          $ref: '#/$defs/hour'
        },
        minute: {
          $ref: '#/$defs/minute'
        },
        timeZone: {
          $ref: '#/$defs/timeZone'
        }
      }
    },
    {
      title: 'Hebdomadaire',
      properties: {
        type: { const: 'weekly' },
        month: { const: '*' },
        dayOfMonth: { const: '*' },
        dayOfWeek: {
          title: 'Day of the Week',
          'x-i18n-title': {
            fr: 'Jour dans la semaine'
          },
          type: 'string',
          oneOf: [
            {
              const: '1',
              title: 'Monday',
              'x-i18n-title': {
                fr: 'Lundi'
              }
            },
            {
              const: '2',
              title: 'Tuesday',
              'x-i18n-title': {
                fr: 'Mardi'
              }
            },
            {
              const: '3',
              title: 'Wednesday',
              'x-i18n-title': {
                fr: 'Mercredi'
              }
            },
            {
              const: '4',
              title: 'Thursday',
              'x-i18n-title': {
                fr: 'Jeudi'
              }
            },
            {
              const: '5',
              title: 'Friday',
              'x-i18n-title': {
                fr: 'Vendredi'
              }
            },
            {
              const: '6',
              title: 'Saturday',
              'x-i18n-title': {
                fr: 'Samedi'
              }
            },
            {
              const: '0',
              title: 'Sunday',
              'x-i18n-title': {
                fr: 'Dimanche'
              }
            }
          ],
          default: '1'
        },
        hour: { $ref: '#/$defs/hour' },
        minute: { $ref: '#/$defs/minute' },
        timeZone: { $ref: '#/$defs/timeZone' }
      }
    },
    {
      title: 'Journalier',
      properties: {
        type: { const: 'daily' },
        month: { const: '*' },
        dayOfMonth: { const: '*' },
        dayOfWeek: { const: '*' },
        hour: { $ref: '#/$defs/hour' },
        minute: { $ref: '#/$defs/minute' },
        timeZone: { $ref: '#/$defs/timeZone' }
      }
    }
  ],
  layout: {
    switch: [
      {
        if: 'summary',
        slots: {
          component: 'scheduling-summary'
        }
      }
    ]
  },
  $defs: {
    hour: {
      title: 'Hour',
      'x-i18n-title': {
        fr: 'Heure'
      },
      type: 'integer',
      minimum: 0,
      maximum: 23,
      default: 0,
      layout: { cols: 6 }
    },
    minute: {
      title: 'Minute',
      'x-i18n-title': {
        fr: 'Minute'
      },
      type: 'integer',
      minimum: 0,
      maximum: 59,
      default: 0,
      layout: { cols: 6 }
    },
    timeZone: {
      type: 'string',
      title: 'Time Zone',
      'x-i18n-title': {
        fr: 'Fuseau horaire'
      },
      default: 'Europe/Paris',
      layout: { comp: 'autocomplete', getItems: 'context.utcs' }
    }
  }
}
