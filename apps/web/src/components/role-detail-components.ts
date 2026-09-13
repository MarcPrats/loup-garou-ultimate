import type { Component } from 'vue'

import Ange from './role-details/Ange.vue'
import Ancien from './role-details/Ancien.vue'
import Bibliothecaire from './role-details/Bibliothecaire.vue'
import Capitaine from './role-details/Capitaine.vue'
import Chasseur from './role-details/Chasseur.vue'
import Chevalier from './role-details/Chevalier.vue'
import Cupidon from './role-details/Cupidon.vue'
import EnfantDeChoeur from './role-details/EnfantDeChoeur.vue'
import EnfantSauvage from './role-details/EnfantSauvage.vue'
import Flutiste from './role-details/Flutiste.vue'
import GrandLoup from './role-details/GrandLoup.vue'
import InfectLoup from './role-details/InfectLoup.vue'
import LoupBlanc from './role-details/LoupBlanc.vue'
import LoupGarouUltime from './role-details/LoupGarouUltime.vue'
import LoupVoyant from './role-details/LoupVoyant.vue'
import MontreurDours from './role-details/MontreurDours.vue'
import PetiteFille from './role-details/PetiteFille.vue'
import Renard from './role-details/Renard.vue'
import Recluse from './role-details/Recluse.vue'
import Sorciere from './role-details/Sorciere.vue'
import Voyante from './role-details/Voyante.vue'
import Ivrogne from './role-details/Ivrogne.vue'

export const ROLE_DETAIL_COMPONENTS: Record<string, Component> = {
    'loup-garou-ultime': LoupGarouUltime,
    'infect-loup': InfectLoup,
    'grand-loup': GrandLoup,
    'loup-voyant': LoupVoyant,
    'loup-blanc': LoupBlanc,
    'petite-fille': PetiteFille,
    renard: Renard,
    'montreur-dours': MontreurDours,
    cupidon: Cupidon,
    voyante: Voyante,
    chevalier: Chevalier,
    capitaine: Capitaine,
    recluse: Recluse,
    'enfant-de-choeur': EnfantDeChoeur,
    bibliothecaire: Bibliothecaire,
    chasseur: Chasseur,
    flutiste: Flutiste,
    sorciere: Sorciere,
    ancien: Ancien,
    'enfant-sauvage': EnfantSauvage,
    ange: Ange,
    ivrogne: Ivrogne,
}

export const FALLBACK_ROLE_DETAIL_COMPONENT = PetiteFille
