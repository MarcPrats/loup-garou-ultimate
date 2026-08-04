import {
  ROLE_CATEGORY,
  type RoleCategory,
} from '@lgu/contracts'
import {
  ROLE_DEFINITIONS,
  ROLE_ID,
  type RoleId,
} from '@lgu/game-core'

export interface RolePresentation {
  readonly id: RoleId
  readonly name: string
  readonly category: RoleCategory
  readonly imagePath: string
  readonly fallbackSymbol: string
  readonly summary: string
  readonly instructions: readonly string[]
}

const PRESENTATION_DETAILS: Record<
  RoleId,
  Omit<RolePresentation, 'id' | 'name' | 'category'>
> = {
  [ROLE_ID.ULTIMATE_WEREWOLF]: {
    imagePath: '/loupgarou.webp',
    fallbackSymbol: '🐺',
    summary: 'Chaque nuit, il choisit un joueur qui meurt. Il ne se réveille pas la première nuit.',
    instructions: [
      'Si vous vous ciblez vous-même, un autre loup-garou devient le Loup Garou Ultime.',
      'Le village gagne dès que vous êtes exécuté.',
    ],
  },
  [ROLE_ID.INFECT_WEREWOLF]: {
    imagePath: '/infectloup.webp',
    fallbackSymbol: '🩸',
    summary: 'Chaque nuit, il choisit un joueur empoisonné pour la nuit et le jour suivants.',
    instructions: [
      'Un joueur empoisonné ne peut utiliser aucun pouvoir.',
      'Votre objectif reste de protéger le Loup Garou Ultime.',
    ],
  },
  [ROLE_ID.GRAND_WEREWOLF]: {
    imagePath: '/grandloup.webp',
    fallbackSymbol: '🌕',
    summary: 'Il devient le Loup Garou Ultime si celui-ci meurt alors qu’au moins cinq joueurs sont en vie.',
    instructions: [
      'Tant que le Loup Garou Ultime vit, vous jouez comme soutien de la meute.',
      'Si vous héritez du rôle ultime, annoncez-le uniquement au maître du jeu.',
    ],
  },
  [ROLE_ID.PETITE_FILLE]: {
    imagePath: '/petite-fille.webp',
    fallbackSymbol: '👧',
    summary: 'Lors de la première nuit, elle apprend qu’un Villageois se cache parmi deux joueurs.',
    instructions: [
      'Votre indice privé montre les deux joueurs concernés et le rôle recherché.',
      'Utilisez cette information sans révéler trop vite votre personnage.',
    ],
  },
  [ROLE_ID.RENARD]: {
    imagePath: '/renard.webp',
    fallbackSymbol: '🦊',
    summary: 'Lors de la première nuit, il apprend qu’un Loup Garou se cache parmi deux joueurs.',
    instructions: [
      'Votre indice privé montre les deux joueurs concernés et le rôle recherché.',
      'Servez-vous de cette piste pour orienter les nominations.',
    ],
  },
  [ROLE_ID.MONTREUR_DOURS]: {
    imagePath: '/montreur-dours.webp',
    fallbackSymbol: '🐻',
    summary: 'Lors de la première nuit, il découvre combien de loups-garous sont placés côte à côte.',
    instructions: [
      'Le maître du jeu vous communique uniquement ce nombre.',
      'Mémorisez l’ordre des joueurs autour de la table.',
    ],
  },
  [ROLE_ID.CUPIDON]: {
    imagePath: '/cupidon.webp',
    fallbackSymbol: '💘',
    summary: 'Chaque nuit, il apprend combien de ses deux voisins vivants sont des loups-garous.',
    instructions: [
      'Vos voisins sont les joueurs vivants placés immédiatement à votre gauche et à votre droite.',
      'Déduisez progressivement la position de la meute.',
    ],
  },
  [ROLE_ID.VOYANTE]: {
    imagePath: '/voyante.webp',
    fallbackSymbol: '🔮',
    summary: 'Chaque nuit, elle choisit deux joueurs et apprend si l’un d’eux est le Loup Garou Ultime.',
    instructions: [
      'Un joueur gentil désigné au début de la partie apparaît comme Loup Garou Ultime.',
      'Votre résultat peut donc contenir un leurre secret.',
    ],
  },
  [ROLE_ID.CHEVALIER]: {
    imagePath: '/chevalier.webp',
    fallbackSymbol: '🛡️',
    summary: 'Chaque nuit, sauf la première, il protège un autre joueur du Loup Garou Ultime.',
    instructions: [
      'Vous ne pouvez pas vous protéger vous-même.',
      'La protection concerne l’attaque du Loup Garou Ultime pendant cette nuit.',
    ],
  },
  [ROLE_ID.CHASSEUR]: {
    imagePath: '/chasseur.webp',
    fallbackSymbol: '🏹',
    summary: 'Une fois par partie, pendant le jour, il désigne publiquement un joueur.',
    instructions: [
      'Si la cible est le Loup Garou Ultime, elle meurt immédiatement.',
      'Sinon, rien ne se passe et votre pouvoir est consommé.',
    ],
  },
  [ROLE_ID.FLUTISTE]: {
    imagePath: '/flute.webp',
    fallbackSymbol: '🎵',
    summary: 'La première fois qu’il est nominé, son nominateur est exécuté si celui-ci est Villageois.',
    instructions: [
      'Votre pouvoir ne se déclenche que lors de votre première nomination.',
      'Il se déclenche uniquement si le nominateur est Villageois, jamais s’il est Loup Garou ou Marginal.',
    ],
  },
  [ROLE_ID.SORCIERE]: {
    imagePath: '/sorciere.webp',
    fallbackSymbol: '🧪',
    summary: 'Si elle meurt la nuit, elle choisit un joueur et découvre son personnage.',
    instructions: [
      'Le pouvoir se déclenche uniquement après une mort pendant la nuit.',
      'Communiquez votre choix discrètement au maître du jeu.',
    ],
  },
  [ROLE_ID.ANCIEN]: {
    imagePath: '/ancien.webp',
    fallbackSymbol: '🧓',
    summary: 'Il est protégé du pouvoir du Loup Garou Ultime.',
    instructions: [
      'Si le Loup Garou Ultime vous cible, vous ne mourez pas.',
      'Les autres causes de mort restent applicables.',
    ],
  },
  [ROLE_ID.ENFANT_SAUVAGE]: {
    imagePath: '/enfant.webp',
    fallbackSymbol: '🌿',
    summary: 'Chaque nuit, sauf la première, il apprend quel personnage a été exécuté pendant le jour.',
    instructions: [
      'Le maître du jeu vous révèle le personnage, jamais l’identité cachée d’un autre joueur.',
      'Utilisez l’historique des exécutions pour affiner vos déductions.',
    ],
  },
  [ROLE_ID.ANGEL]: {
    imagePath: '/ange.webp',
    fallbackSymbol: '😇',
    summary: 'Si l’Ange meurt par exécution, son équipe perd immédiatement.',
    instructions: [
      'Évitez toute exécution publique.',
      'Une mort causée autrement ne déclenche pas cette défaite immédiate.',
    ],
  },
}

export const ROLE_PRESENTATION_BY_ID = Object.fromEntries(
  ROLE_DEFINITIONS.map((role) => [
    role.id,
    {
      id: role.id,
      name: role.name,
      category: role.category,
      ...PRESENTATION_DETAILS[role.id],
    },
  ]),
) as Record<RoleId, RolePresentation>

export const ROLE_CATEGORY_LABEL: Record<RoleCategory, string> = {
  [ROLE_CATEGORY.VILLAGER]: 'Villageois',
  [ROLE_CATEGORY.OUTSIDER]: 'Marginal',
  [ROLE_CATEGORY.WEREWOLF]: 'Loup-garou',
  [ROLE_CATEGORY.ULTIMATE_WEREWOLF]: 'Loup ultime',
}

export const IVROGNE_PRESENTATION = {
  name: 'Ivrogne',
  imagePath: '/ivrogne-v3.webp',
  fallbackSymbol: '🍺',
  summary: 'Ce joueur croit posséder son rôle affiché, mais il est secrètement Ivrogne.',
} as const

export function getRolePresentation(roleId: string): RolePresentation | null {
  return ROLE_PRESENTATION_BY_ID[roleId as RoleId] ?? null
}
