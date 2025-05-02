Pour l'import :

-> Le catalogue liste les jeux de données
-> On peut rajouter un schéma de config de filtre de données : Utile pour filtrer sur data-gouv.fr par organisation
-> Si le catalog à une capacité de configuration par jeu de données, on affiche le formulaire de configuration
-> Quand on valide le formulaire de configuration, on stock le lien en base avec l'id du jdd distant
-> Le worker viens créer le jeu de données local à partir de la configuration du jdd du catalog

Pour la publication :

-> Data-fair envoie juste un webhook à l'API de catalogs
-> Le worker de catalogs utilise une fonction du plugin pour effectuer la publication, en passant une instance de axios authentifié

Table link :
catalog id
datafair dataset id
distant dataset id
link config
type (import, export)
status (waiting, in progress, done, error)



Je vois pas trop comment gérer la transition
-> Transition des catalogues
  - Transition des configs, ok pas trop compliqué
  - Ya l'histoire du catalogId aussi
-> Transition des publications
