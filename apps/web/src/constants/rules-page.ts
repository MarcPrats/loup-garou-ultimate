import { appAsset } from './paths'

export type RulesRoleCategory =
  | 'villageois'
  | 'marginal'
  | 'loup-garou'
  | 'loup-garou-ultime'

export interface RulesRoleCatalogEntry {
  readonly id: string
  readonly name: string
  readonly category: RulesRoleCategory
  readonly categoryLabel: string
  readonly imagePath?: string
  readonly emoji?: string
  readonly summary: string
  readonly available: boolean
}

export interface RulesDistributionRow {
  readonly players: number
  readonly villagers: number
  readonly outsiders: number
  readonly werewolves: number
  readonly ultimateWerewolf: number
}

export interface RulesNightStepData {
  readonly title: string
  readonly roleId?: string
  readonly imagePath?: string
  readonly imageAlt?: string
  readonly emoji?: string
  readonly condition?: string
  readonly lines: readonly {
    readonly text: string
    readonly kind?: 'eye' | 'normal'
  }[]
}

export interface RulesNightSectionData {
  readonly label: string
  readonly minimumPlayers?: number
  readonly steps: readonly RulesNightStepData[]
}

export function filterRulesNightSections(
  sections: readonly RulesNightSectionData[],
  presentRoleIds: readonly string[],
  playerCount: number,
): RulesNightSectionData[] {
  const presentRoles = new Set(presentRoleIds)

  return sections.flatMap((section) => {
    if (section.minimumPlayers && playerCount < section.minimumPlayers) return []

    const steps = section.steps.filter((step) => (
      !step.roleId || presentRoles.has(step.roleId)
    ))

    return steps.length > 0 ? [{ ...section, steps }] : []
  })
}

export const RULES_ROLE_CATEGORIES: readonly {
  readonly id: RulesRoleCategory
  readonly label: string
  readonly emoji: string
}[] = [
  { id: 'loup-garou-ultime', label: 'Loup Garou Ultime', emoji: '🌕' },
  { id: 'loup-garou', label: 'Loups Garous', emoji: '🐺' },
  { id: 'villageois', label: 'Villageois', emoji: '👥' },
  { id: 'marginal', label: 'Marginaux', emoji: '🌀' },
]

export const RULES_ROLE_CATALOG: readonly RulesRoleCatalogEntry[] = [
  {
    id: 'loup-garou-ultime',
    name: 'Loup Garou Ultime',
    category: 'loup-garou-ultime',
    categoryLabel: 'Loup Garou Ultime',
    imagePath: appAsset('/images/loupgarou.webp'),
    summary: 'Chaque nuit*, choisissez un joueur : il meurt. Si vous vous tuez ainsi, un Loup Garou devient le Loup Garou Ultime. * Ne se réveille pas la première nuit.',
    available: true,
  },
  {
    id: 'infect-loup',
    name: 'Infect Loup Garou',
    category: 'loup-garou',
    categoryLabel: 'Loup Garou',
    imagePath: appAsset('/images/infectloup.webp'),
    summary: 'Chaque nuit, choisissez un joueur : il est empoisonné cette nuit et le jour suivant.',
    available: true,
  },
  {
    id: 'espion',
    name: 'Espion',
    category: 'loup-garou',
    categoryLabel: 'Loup Garou',
    emoji: '🕵️',
    summary: 'Chaque nuit, vous consultez les informations du MJ. Vous pouvez être perçu comme Gentil et comme Villageois ou Marginal, même mort(e).',
    available: false,
  },
  {
    id: 'grand-loup',
    name: 'Grand Loup Garou',
    category: 'loup-garou',
    categoryLabel: 'Loup Garou',
    imagePath: appAsset('/images/grandloup.webp'),
    summary: 'Si 5 joueurs ou plus sont en vie et que le Loup Garou Ultime meurt, vous devenez le Loup Garou Ultime.',
    available: true,
  },
  {
    id: 'baron',
    name: 'Baron',
    category: 'loup-garou',
    categoryLabel: 'Loup Garou',
    emoji: '⚖️',
    summary: 'Deux marginaux supplémentaires ont été ajoutés au jeu.',
    available: false,
  },
  {
    id: 'petite-fille',
    name: 'Petite Fille',
    category: 'villageois',
    categoryLabel: 'Villageois',
    imagePath: appAsset('/images/petite-fille.webp'),
    summary: "Lors de la première nuit, vous savez qu'un Villageois se cache parmi deux joueurs.",
    available: true,
  },
  {
    id: 'bibliothecaire',
    name: 'Bibliothécaire',
    category: 'villageois',
    categoryLabel: 'Villageois',
    emoji: '📚',
    summary: "Lors de la première nuit, vous savez qu'un Marginal se cache parmi deux joueurs. (Ou qu'il n'y en a aucun en jeu.)",
    available: false,
  },
  {
    id: 'renard',
    name: 'Renard',
    category: 'villageois',
    categoryLabel: 'Villageois',
    imagePath: appAsset('/images/renard.webp'),
    summary: "Lors de la première nuit, vous savez qu'un Loup Garou se cache parmi deux joueurs.",
    available: true,
  },
  {
    id: 'montreur-dours',
    name: "Montreur d'ours",
    category: 'villageois',
    categoryLabel: 'Villageois',
    imagePath: appAsset('/images/montreur-dours.webp'),
    summary: 'Lors de la première nuit, vous découvrez combien de loup garous sont placés côte à côte.',
    available: true,
  },
  {
    id: 'cupidon',
    name: 'Cupidon',
    category: 'villageois',
    categoryLabel: 'Villageois',
    imagePath: appAsset('/images/cupidon.webp'),
    summary: 'Chaque nuit, vous apprenez combien de vos 2 voisins vivants sont des Loups Garous.',
    available: true,
  },
  {
    id: 'voyante',
    name: 'Voyante',
    category: 'villageois',
    categoryLabel: 'Villageois',
    imagePath: appAsset('/images/voyante.webp'),
    summary: "Chaque nuit, choisissez 2 joueurs : vous apprenez si l'un d'eux est le Loup Garou Ultime. Un joueur Gentil vous apparaît comme Loup Garou Ultime.",
    available: true,
  },
  {
    id: 'enfant-sauvage',
    name: 'Enfant Sauvage',
    category: 'villageois',
    categoryLabel: 'Villageois',
    imagePath: appAsset('/images/enfant.webp'),
    summary: "Chaque nuit*, vous apprenez quel personnage a été exécuté aujourd'hui. * Ne se réveille pas la première nuit.",
    available: true,
  },
  {
    id: 'chevalier',
    name: 'Chevalier',
    category: 'villageois',
    categoryLabel: 'Villageois',
    imagePath: appAsset('/images/chevalier.webp'),
    summary: 'Chaque nuit*, choisissez un joueur (pas vous-même) : il est protégé du Loup Garou Ultime cette nuit. * Ne se réveille pas la première nuit.',
    available: true,
  },
  {
    id: 'sorciere',
    name: 'Sorcière',
    category: 'villageois',
    categoryLabel: 'Villageois',
    imagePath: appAsset('/images/sorciere.webp'),
    summary: 'Si vous mourez la nuit, vous êtes réveillé(e) pour choisir un joueur : vous apprenez son personnage.',
    available: true,
  },
  {
    id: 'flutiste',
    name: 'Joueur de flûte',
    category: 'villageois',
    categoryLabel: 'Villageois',
    imagePath: appAsset('/images/flute.webp'),
    summary: "La première fois que vous êtes nominé(e), si le nominateur est un Villageois, il est immédiatement exécuté.",
    available: true,
  },
  {
    id: 'chasseur',
    name: 'Chasseur',
    category: 'villageois',
    categoryLabel: 'Villageois',
    imagePath: appAsset('/images/chasseur.webp'),
    summary: "Une fois par partie, pendant le jour, désignez publiquement un joueur : s'il est le Loup Garou Ultime, il meurt.",
    available: true,
  },
  {
    id: 'ancien',
    name: 'Ancien',
    category: 'villageois',
    categoryLabel: 'Villageois',
    imagePath: appAsset('/images/ancien.webp'),
    summary: 'Vous êtes protégé(e) du Loup Garou Ultime.',
    available: true,
  },
  {
    id: 'capitaine',
    name: 'Capitaine',
    category: 'villageois',
    categoryLabel: 'Villageois',
    imagePath: appAsset('/images/capitaine.webp'),
    emoji: '🎖️',
    summary: "Si le Capitaine est vivant et que trois joueurs restent en vie sans exécution pendant la journée, le Village gagne. La nuit, le MJ peut choisir une autre victime si le Capitaine est ciblé.",
    available: true,
  },
  {
    id: 'majordome',
    name: 'Majordome',
    category: 'marginal',
    categoryLabel: 'Marginal',
    emoji: '🙏',
    summary: 'Chaque nuit, choisissez un joueur (pas vous-même) : demain, vous ne pouvez voter que si ce joueur vote aussi.',
    available: false,
  },
  {
    id: 'ivrogne',
    name: 'Ivrogne',
    category: 'marginal',
    categoryLabel: 'Marginal',
    imagePath: appAsset('/images/ivrogne.webp'),
    emoji: '🍺',
    summary: "Vous ne savez pas que vous êtes l'Ivrogne. Vous croyez être un personnage Villageois, mais ce n'est pas le cas.",
    available: true,
  },
  {
    id: 'recluse',
    name: 'Recluse',
    category: 'marginal',
    categoryLabel: 'Marginal',
    imagePath: appAsset('/images/recluse.webp'),
    emoji: '🧍',
    summary: 'Le Maître du Jeu peut vous faire apparaître comme Loup Garou ou Loup Garou Ultime pour les pouvoirs d’information, même après votre mort.',
    available: true,
  },
  {
    id: 'ange',
    name: 'Ange',
    category: 'marginal',
    categoryLabel: 'Marginal',
    imagePath: appAsset('/images/ange.webp'),
    summary: 'Si vous mourez par exécution, votre équipe perd.',
    available: true,
  },
]

export const RULES_DISTRIBUTION: readonly RulesDistributionRow[] = [
  { players: 5, villagers: 3, outsiders: 0, werewolves: 1, ultimateWerewolf: 1 },
  { players: 6, villagers: 3, outsiders: 1, werewolves: 1, ultimateWerewolf: 1 },
  { players: 7, villagers: 5, outsiders: 0, werewolves: 1, ultimateWerewolf: 1 },
  { players: 8, villagers: 5, outsiders: 1, werewolves: 1, ultimateWerewolf: 1 },
  { players: 9, villagers: 5, outsiders: 2, werewolves: 1, ultimateWerewolf: 1 },
  { players: 10, villagers: 7, outsiders: 0, werewolves: 2, ultimateWerewolf: 1 },
  { players: 11, villagers: 7, outsiders: 1, werewolves: 2, ultimateWerewolf: 1 },
  { players: 12, villagers: 7, outsiders: 2, werewolves: 2, ultimateWerewolf: 1 },
  { players: 13, villagers: 9, outsiders: 0, werewolves: 3, ultimateWerewolf: 1 },
  { players: 14, villagers: 9, outsiders: 1, werewolves: 3, ultimateWerewolf: 1 },
  { players: 15, villagers: 9, outsiders: 2, werewolves: 3, ultimateWerewolf: 1 },
]

const normal = (text: string) => ({ text, kind: 'normal' as const })
const eye = (text: string) => ({ text, kind: 'eye' as const })

export const FIRST_NIGHT_SECTIONS: readonly RulesNightSectionData[] = [
  {
    label: 'Mise en place',
    steps: [{ title: 'Tout le monde ferme les yeux', emoji: '😴', lines: [normal('Attendre environ 10 secondes.')] }],
  },
  {
    label: 'Info des Loups Garous (7 joueurs ou plus)',
    minimumPlayers: 7,
    steps: [{ title: 'Info Loups Garous', emoji: '🐺', lines: [eye('Les Loups Garous ouvrent les yeux et se regardent. Pointez le Loup Garou Ultime.'), normal('😴')] }],
  },
  {
    label: 'Actions des rôles',
    steps: [
      { roleId: 'infect-loup', title: 'Infect Loup Garou', imagePath: appAsset('/images/infectloup.webp'), imageAlt: 'Empoisonneur', lines: [eye("L'Infect Loup Garou désigne un joueur — ce joueur est empoisonné."), normal('😴')] },
      { roleId: 'espion', title: 'Espion', emoji: '🕵️', lines: [eye("Montrez vos informations à l'espion aussi longtemps que nécessaire."), normal('😴')] },
      { roleId: 'petite-fille', title: 'Petite Fille', imagePath: appAsset('/images/petite-fille.webp'), imageAlt: 'Petite Fille', lines: [eye("Montrez la carte d'un Villageois en jeu. Désignez 2 joueurs dont l'un est ce Villageois."), normal('😴')] },
      { roleId: 'bibliothecaire', title: 'Bibliothécaire', emoji: '📚', lines: [eye('Si des Marginaux sont en jeu : montrez le jeton d’un Marginal et désignez 2 joueurs dont l’un est ce Marginal. Sinon : signalez le chiffre « 0 ».') , normal('😴')] },
      { roleId: 'renard', title: 'Renard', imagePath: appAsset('/images/renard.webp'), imageAlt: 'Renard', lines: [eye("Montrez le jeton d'un Loup Garou en jeu. Désignez 2 joueurs dont l'un est ce Loup Garou."), normal('😴')] },
      { roleId: 'montreur-dours', title: "Montreur d'ours", imagePath: appAsset('/images/montreur-dours.webp'), imageAlt: "Montreur d'ours", lines: [eye('Signalez avec les doigts le nombre de Loups Garous voisins l\'un de l\'autre (0, 1, 2).'), normal('😴')] },
      { roleId: 'cupidon', title: 'Cupidon', imagePath: appAsset('/images/cupidon.webp'), imageAlt: 'Cupidon', lines: [eye('Signalez le nombre de Loups Garous vivants voisins de Cupidon (0, 1 ou 2).'), normal('😴')] },
      { roleId: 'voyante', title: 'Voyante', imagePath: appAsset('/images/voyante.webp'), imageAlt: 'Voyante', lines: [eye('La Voyante désigne 2 joueurs. Acquiescez (oui) si l’un est le Loup Garou Ultime ou marqué « Leurre », secouez la tête (non) sinon.'), normal('😴')] },
      { roleId: 'majordome', title: 'Majordome', emoji: '🙏', lines: [eye('Le Majordome désigne un joueur — marquez ce joueur comme « Maître ».'), normal('😴')] },
    ],
  },
  {
    label: 'Lever du soleil',
    steps: [{ title: 'Lever du soleil', emoji: '☀️', lines: [normal("Attendre environ 10 secondes. Demandez à tout le monde d'ouvrir les yeux. Annoncez immédiatement les morts (s'il y en a)." )] }],
  },
]

export const FOLLOWING_NIGHT_SECTIONS: readonly RulesNightSectionData[] = [
  {
    label: 'Mise en place',
    steps: [{ title: 'Tout le monde ferme les yeux', emoji: '😴', lines: [normal('Attendre environ 10 secondes. Chaque Voyageur ayant un pouvoir de nuit agit.')] }],
  },
  {
    label: 'Actions des rôles',
    steps: [
      { roleId: 'infect-loup', title: 'Infect Loup Garou', imagePath: appAsset('/images/infectloup.webp'), imageAlt: 'Empoisonneur', lines: [normal("Le joueur Empoisonné ne l'est plus."), eye("L'Infect Loup Garou désigne un nouveau joueur — ce joueur est empoisonné."), normal('😴')] },
      { roleId: 'chevalier', title: 'Chevalier', imagePath: appAsset('/images/chevalier.webp'), imageAlt: 'Chevalier', lines: [normal("Le joueur Protégé ne l'est plus."), eye('Le Chevalier désigne un joueur (pas lui-même) — ce joueur est « Protégé ».') , normal('😴')] },
      { roleId: 'espion', title: 'Espion', emoji: '🕵️', lines: [eye("Montrez vos informations à l'Espion aussi longtemps que nécessaire."), normal('😴')] },
      { roleId: 'loup-garou-ultime', title: 'Loup Garou Ultime', imagePath: appAsset('/images/loupgarou.webp'), imageAlt: 'Loup Garou Ultime', lines: [eye('Le Loup Garou Ultime désigne un joueur — ce joueur meurt.'), normal('😴')] },
      { roleId: 'sorciere', title: 'Sorcière', imagePath: appAsset('/images/sorciere.webp'), imageAlt: 'Sorcière', condition: 'Uniquement si la Sorcière est morte cette nuit :', lines: [eye('La Sorcière désigne un joueur — montrez-lui la carte de ce joueur.'), normal('😴')] },
      { roleId: 'enfant-sauvage', title: 'Enfant Sauvage', imagePath: appAsset('/images/enfant.webp'), imageAlt: 'Enfant Sauvage', condition: "Uniquement si un joueur a été exécuté aujourd'hui :", lines: [eye("Montrez à l'Enfant Sauvage la carte de ce joueur."), normal('😴')] },
      { roleId: 'cupidon', title: 'Cupidon', imagePath: appAsset('/images/cupidon.webp'), imageAlt: 'Cupidon', lines: [eye('Signalez le nombre de Loup Garous voisins vivants de Cupidon (0, 1 ou 2).'), normal('😴')] },
      { roleId: 'voyante', title: 'Voyante', imagePath: appAsset('/images/voyante.webp'), imageAlt: 'Voyante', lines: [eye('La Voyante désigne 2 joueurs. Acquiescez (oui) si l’un est le Loup Garou Ultime ou marqué « Leurre », secouez la tête (non) sinon.'), normal('😴')] },
      { roleId: 'majordome', title: 'Majordome', emoji: '🙏', lines: [eye('Le Majordome désigne un joueur — marquez ce joueur comme « Maître ».'), normal('😴')] },
    ],
  },
  {
    label: 'Lever du soleil',
    steps: [{ title: 'Lever du soleil', emoji: '☀️', lines: [normal("Attendre environ 10 secondes. Demandez à tout le monde d'ouvrir les yeux. Annoncez les morts.")] }],
  },
]
