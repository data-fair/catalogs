// Texts of the events sent to the events service, in every language of the platform:
// events picks the one of each subscription (see InternationalizedTitle in lib-common-types/event)

export type EventText = { fr: string, en: string }
type Lang = keyof EventText
type Params = Record<string, string | number | undefined>

const fr = {
  'catalog-create': 'Le catalogue {title} a été créé',
  'catalog-patch': 'Le catalogue {title} a été modifié',
  'catalog-delete': 'Le catalogue {title} a été supprimé',
  'catalog-delete-with-publications': 'Le catalogue {title} a été supprimé avec ses publications',
  'import-create': "L'import de la ressource {title} a été créé",
  'import-update': "L'import de la ressource {title} a été modifié",
  'import-delete': "L'import de la ressource {title} a été supprimé",
  'import-replace': "L'import de la ressource {title} a été supprimé (remplacé par un nouvel import)",
  'import-error': "L'import de la ressource {title} a échoué",
  'publication-create': 'La publication du jeu de données {title} a été créée',
  'publication-error': 'La publication du jeu de données {title} a échoué'
}

export type EventTextKey = keyof typeof fr

const en: Record<EventTextKey, string> = {
  'catalog-create': 'The catalog {title} was created',
  'catalog-patch': 'The catalog {title} was updated',
  'catalog-delete': 'The catalog {title} was deleted',
  'catalog-delete-with-publications': 'The catalog {title} was deleted along with its publications',
  'import-create': 'The import of the resource {title} was created',
  'import-update': 'The import of the resource {title} was updated',
  'import-delete': 'The import of the resource {title} was deleted',
  'import-replace': 'The import of the resource {title} was deleted (replaced by a new import)',
  'import-error': 'The import of the resource {title} failed',
  'publication-create': 'The publication of the dataset {title} was created',
  'publication-error': 'The publication of the dataset {title} failed'
}

export const messages: Record<Lang, Record<EventTextKey, string>> = { fr, en }

/** Actions of a resource that have an event title, e.g. EventAction<'import'> = 'create' | 'update' | … */
export type EventAction<Resource extends string, Key = EventTextKey> = Key extends `${Resource}-${infer Action}` ? Action : never

const langs = Object.keys(messages) as Lang[]

const interpolate = (message: string, params: Params) =>
  message.replace(/\{(\w+)\}/g, (match, name) => params[name] === undefined ? match : String(params[name]))

export const eventText = (key: EventTextKey, params: Params = {}): EventText =>
  Object.fromEntries(langs.map(lang => [lang, interpolate(messages[lang][key], params)])) as EventText
