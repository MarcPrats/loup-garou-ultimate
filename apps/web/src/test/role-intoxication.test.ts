import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { ROLE_CATEGORY } from '@lgu/contracts'

import { ROLE_DETAIL_COMPONENTS } from '../components/role-detail-components'
import { getRolePresentation } from '../constants/role-presentation'

describe('role intoxication details', () => {
    it.each(Object.keys(ROLE_DETAIL_COMPONENTS))(
        'shows role-specific intoxication guidance only for Villageois and Marginaux: %s',
        (roleId) => {
            const role = getRolePresentation(roleId)
            const component = ROLE_DETAIL_COMPONENTS[roleId]
            const wrapper = mount(component, {
                props: {
                    powerTitle: 'Votre Pouvoir',
                    infoTitle: 'Autres Infos',
                    currentRoleId: roleId,
                },
            })

            expect(role).not.toBeNull()
            const expectsSection = roleId !== 'ivrogne'
                && (role?.category === ROLE_CATEGORY.VILLAGER || role?.category === ROLE_CATEGORY.OUTSIDER)
            expect(wrapper.find('.app-role-intoxication-section').exists()).toBe(
                expectsSection,
            )
            if (expectsSection) {
                expect(wrapper.find('.app-role-intoxication-section').text()).toContain(
                    "À tout moment du jeu, vous pouvez être ivre ou empoisonné(e), si c'est le cas alors",
                )
            }
        },
    )

    it('explains that intoxication can alter the Voyante information result', () => {
        const wrapper = mount(ROLE_DETAIL_COMPONENTS.voyante, {
            props: {
                powerTitle: 'Votre Pouvoir',
                infoTitle: 'Autres Infos',
                currentRoleId: 'voyante',
            },
        })

        expect(wrapper.find('.app-role-intoxication-section').text()).toContain(
            "l'information donnée par le Maître du Jeu peut être fausse",
        )
    })
})