import { describe, expect, it } from 'vitest'

import {
  FIRST_NIGHT_SECTIONS,
  FOLLOWING_NIGHT_SECTIONS,
  filterRulesNightSections,
} from '../constants/rules-page'

function stepTitles(
  sections: ReturnType<typeof filterRulesNightSections>,
): string[] {
  return sections.flatMap((section) => section.steps.map((step) => step.title))
}

describe('filtered night sections', () => {
  it('keeps generic steps and only present roles', () => {
    const firstNight = filterRulesNightSections(FIRST_NIGHT_SECTIONS, ['voyante'], 5)
    const titles = stepTitles(firstNight)

    expect(titles).toContain('Tout le monde ferme les yeux')
    expect(titles).toContain('Voyante')
    expect(titles).toContain('Lever du soleil')
    expect(titles).not.toContain('Infect Loup Garou')
    expect(titles).not.toContain('Cupidon')
    expect(titles).not.toContain('Info Loups Garous')
  })

  it('shows the seven-player wolf information only from seven players', () => {
    const fivePlayerNight = filterRulesNightSections(FIRST_NIGHT_SECTIONS, ['voyante'], 5)
    const sevenPlayerNight = filterRulesNightSections(FIRST_NIGHT_SECTIONS, ['voyante'], 7)

    expect(stepTitles(fivePlayerNight)).not.toContain('Info Loups Garous')
    expect(stepTitles(sevenPlayerNight)).toContain('Info Loups Garous')
  })

  it('filters following-night actions independently', () => {
    const followingNight = filterRulesNightSections(
      FOLLOWING_NIGHT_SECTIONS,
      ['loup-garou-ultime', 'chevalier'],
      5,
    )
    const titles = stepTitles(followingNight)

    expect(titles).toContain('Loup Garou Ultime')
    expect(titles).toContain('Chevalier')
    expect(titles).not.toContain('Voyante')
    expect(titles).not.toContain('Cupidon')
  })
})
