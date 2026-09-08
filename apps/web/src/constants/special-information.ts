import { SPECIAL_INFORMATION_TYPE, type SpecialInformationType } from '@lgu/contracts'

export interface SpecialInformationPresentation {
  readonly label: string
  readonly title: string
  readonly targetLabel: string
}

const PRESENTATIONS: Record<SpecialInformationType, SpecialInformationPresentation> = {
  [SPECIAL_INFORMATION_TYPE.RENARD]: { label: '🦊 Info Renard', title: 'Indice du Renard', targetLabel: 'Loup' },
  [SPECIAL_INFORMATION_TYPE.PETITE_FILLE]: { label: '👧 Info Petite Fille', title: 'Indice de la Petite Fille', targetLabel: 'Villageois' },
  [SPECIAL_INFORMATION_TYPE.BIBLIOTHECAIRE]: { label: '📚 Info Bibliothécaire', title: 'Indice de la Bibliothécaire', targetLabel: 'Marginal' },
}

export function getSpecialInformationPresentation(
  type: SpecialInformationType,
): SpecialInformationPresentation {
  return PRESENTATIONS[type]
}
