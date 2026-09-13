import {
  ROLE_CATEGORY,
  type RoleCategory,
} from '@lgu/contracts'

import { appAsset } from './paths'
import {
  ROLE_DEFINITIONS,
  ROLE_ID,
  type RoleId,
} from '@lgu/game-core'

export const IVROGNE_ROLE_ID = 'ivrogne' as const
export type PresentationRoleId = RoleId | typeof IVROGNE_ROLE_ID

export interface RolePresentation {
  readonly id: PresentationRoleId
  readonly name: string
  readonly category: RoleCategory
  readonly imagePath: string
  readonly fallbackSymbol: string
}

const PRESENTATION_DETAILS: Record<
  RoleId,
  Pick<RolePresentation, 'imagePath' | 'fallbackSymbol'>
> = {
  [ROLE_ID.ULTIMATE_WEREWOLF]: {
    imagePath: appAsset('/images/loupgarou.webp'),
    fallbackSymbol: '🐺',
  },
  [ROLE_ID.INFECT_WEREWOLF]: {
    imagePath: appAsset('/images/infectloup.webp'),
    fallbackSymbol: '🩸',
  },
  [ROLE_ID.GRAND_WEREWOLF]: {
    imagePath: appAsset('/images/grandloup.webp'),
    fallbackSymbol: '🌕',
  },
  [ROLE_ID.PETITE_FILLE]: {
    imagePath: appAsset('/images/petite-fille.webp'),
    fallbackSymbol: '👧',
  },
  [ROLE_ID.RENARD]: {
    imagePath: appAsset('/images/renard.webp'),
    fallbackSymbol: '🦊',
  },
  [ROLE_ID.MONTREUR_DOURS]: {
    imagePath: appAsset('/images/montreur-dours.webp'),
    fallbackSymbol: '🐻',
  },
  [ROLE_ID.CUPIDON]: {
    imagePath: appAsset('/images/cupidon.webp'),
    fallbackSymbol: '💘',
  },
  [ROLE_ID.VOYANTE]: {
    imagePath: appAsset('/images/voyante.webp'),
    fallbackSymbol: '🔮',
  },
  [ROLE_ID.CHEVALIER]: {
    imagePath: appAsset('/images/chevalier.webp'),
    fallbackSymbol: '🛡️',
  },
  [ROLE_ID.CAPITAINE]: {
    imagePath: appAsset('/images/capitaine.webp'),
    fallbackSymbol: '🎖️',
  },
  [ROLE_ID.RECLUSE]: {
    imagePath: appAsset('/images/recluse.webp'),
    fallbackSymbol: '🧍',
  },
  [ROLE_ID.ENFANT_DE_CHOEUR]: {
    imagePath: appAsset('/images/enfant-de-choeur.webp'),
    fallbackSymbol: '🕯️',
  },
  [ROLE_ID.BIBLIOTHECAIRE]: {
    imagePath: appAsset('/images/bibliothecaire.webp'),
    fallbackSymbol: '📚',
  },
  [ROLE_ID.LOUP_VOYANT]: {
    imagePath: appAsset('/images/loup_voyant.webp'),
    fallbackSymbol: '🐺',
  },
  [ROLE_ID.LOUP_BLANC]: {
    imagePath: appAsset('/images/loup_blanc.webp'),
    fallbackSymbol: '🐺',
  },
  [ROLE_ID.CHASSEUR]: {
    imagePath: appAsset('/images/chasseur.webp'),
    fallbackSymbol: '🏹',
  },
  [ROLE_ID.FLUTISTE]: {
    imagePath: appAsset('/images/flute.webp'),
    fallbackSymbol: '🎵',
  },
  [ROLE_ID.SORCIERE]: {
    imagePath: appAsset('/images/sorciere.webp'),
    fallbackSymbol: '🧪',
  },
  [ROLE_ID.ANCIEN]: {
    imagePath: appAsset('/images/ancien.webp'),
    fallbackSymbol: '🧓',
  },
  [ROLE_ID.ENFANT_SAUVAGE]: {
    imagePath: appAsset('/images/enfant.webp'),
    fallbackSymbol: '🌿',
  },
  [ROLE_ID.ANGEL]: {
    imagePath: appAsset('/images/ange.webp'),
    fallbackSymbol: '😇',
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
  imagePath: appAsset('/images/ivrogne.webp'),
  fallbackSymbol: '🍺',
  summary: 'Cette personne croit posséder son rôle affiché, mais elle est secrètement Ivrogne.',
} as const

const IVROGNE_ROLE_PRESENTATION: RolePresentation = {
  id: IVROGNE_ROLE_ID,
  name: IVROGNE_PRESENTATION.name,
  category: ROLE_CATEGORY.OUTSIDER,
  imagePath: IVROGNE_PRESENTATION.imagePath,
  fallbackSymbol: IVROGNE_PRESENTATION.fallbackSymbol,
}

export function getRolePresentation(roleId: string): RolePresentation | null {
  if (roleId === IVROGNE_ROLE_ID) return IVROGNE_ROLE_PRESENTATION
  return ROLE_PRESENTATION_BY_ID[roleId as RoleId] ?? null
}
