import type { Import, Publication } from '#api/types'

import eventsQueue from '@data-fair/lib-node/events-queue.js'

const errorTitles = {
  import: (title: string) => ({ en: `The import of the resource ${title} failed`, fr: `L'import de la ressource ${title} a échoué` }),
  publication: (title: string) => ({ en: `The publication of the dataset ${title} failed`, fr: `La publication du jeu de données ${title} a échoué` })
}

/**
 * Send the failure event of an import or a publication.
 * @param resourceTitle The title of the imported resource or of the published dataset
 */
export const sendTaskErrorEvent = (type: keyof typeof errorTitles, task: Import | Publication, resourceTitle: string) => {
  eventsQueue.pushEvent({
    title: errorTitles[type](resourceTitle),
    topic: { key: `catalogs:${type}-error:${task._id}` },
    sender: task.owner,
    resource: {
      type: 'catalog',
      id: task.catalog.id,
      title: task.catalog.title
    },
    originator: {
      internalProcess: {
        id: 'catalogs-worker',
        title: 'Catalogs Worker'
      }
    },
    urlParams: {
      catalogId: task.catalog.id,
      type: type + 's',
      itemId: task._id
    }
  })
}
