// `{catalogId}` is the catalog seeded by runner/fixtures.ts, connected to the mock plugin.
import type { SimulationCase } from '@data-fair/lib-agents-sim'

const persona = "Vous êtes Claire, chargée de l'open data dans une collectivité et administratrice de votre organisation. Vous savez ce que vous voulez obtenir mais vous ne connaissez pas bien cet outil : vous comptez sur l'assistant pour vous guider, et vous faites ce qu'il vous demande de faire vous-même."

export const cases: SimulationCase[] = [
  {
    name: 'catalogue-creation',
    route: '/data-fair/catalogs/new',
    persona,
    goal: "Connecter un nouveau catalogue distant de type « Mock », nommé « Catalogue national de test », dont l'adresse est https://www.data.gouv.fr, puis le voir apparaître dans la liste des catalogues.",
    maxTurns: 10
  },
  {
    name: 'catalogue-configuration',
    route: '/data-fair/catalogs/{catalogId}',
    persona,
    goal: 'Ajouter au catalogue « Catalogue open data de la région » la description « Catalogue de démonstration, ne pas utiliser en production » et que la modification soit enregistrée.',
    maxTurns: 8
  },
  {
    name: 'import-ressource',
    route: '/data-fair/catalogs/{catalogId}',
    persona,
    goal: 'Importer la ressource « Population par commune 2023 » du catalogue « Catalogue open data de la région » en jeu de données, mis à jour automatiquement une fois par mois.',
    maxTurns: 12
  }
]
