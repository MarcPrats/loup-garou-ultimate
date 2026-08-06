import type { Pinia } from 'pinia'
import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router'

import { SESSION_DESTINATION, type SessionDestination } from '@lgu/contracts'

import { ROUTE_NAME, ROUTE_PATH, type RouteName } from '../constants/app'
import { useLobbyStore } from '../stores/lobby'
import GameMasterView from '../views/GameMasterView.vue'
import HomeView from '../views/HomeView.vue'
import LobbyView from '../views/LobbyView.vue'
import PlayerRoleView from '../views/PlayerRoleView.vue'
import RoleAccessView from '../views/RoleAccessView.vue'
import RulesView from '../views/RulesView.vue'
import RoleDetailView from '../views/RoleDetailView.vue'
import SimulatorView from '../features/simulator/SimulatorView.vue'

export function routeNameForDestination(
  destination: SessionDestination | null,
): RouteName {
  switch (destination) {
    case SESSION_DESTINATION.PLAYER_ROLE:
      return ROUTE_NAME.PLAYER_ROLE
    case SESSION_DESTINATION.GAME_MASTER:
      return ROUTE_NAME.GAME_MASTER
    default:
      return ROUTE_NAME.LOBBY
  }
}


export function createAppRouter(pinia: Pinia) {
  const routes: RouteRecordRaw[] = [
    {
      path: ROUTE_PATH.HOME,
      name: ROUTE_NAME.HOME,
      component: HomeView,
    },
    {
      path: ROUTE_PATH.ENTRY,
      alias: ['/waiting_room/'],
      name: ROUTE_NAME.ENTRY,
      component: HomeView,
    },
    {
      path: ROUTE_PATH.LOBBY,
      name: ROUTE_NAME.LOBBY,
      component: LobbyView,
      meta: { requiresSession: true },
    },
    {
      path: ROUTE_PATH.PLAYER_ROLE,
      name: ROUTE_NAME.PLAYER_ROLE,
      component: PlayerRoleView,
      meta: { requiresSession: true },
    },
    {
      path: ROUTE_PATH.GAME_MASTER,
      name: ROUTE_NAME.GAME_MASTER,
      component: GameMasterView,
      meta: { requiresSession: true },
    },
    {
      path: ROUTE_PATH.ROLE_ACCESS,
      name: ROUTE_NAME.ROLE_ACCESS,
      component: RoleAccessView,
      meta: { roleAccess: true },
    },
    {
      path: ROUTE_PATH.RULES,
      name: ROUTE_NAME.RULES,
      component: RulesView,
      meta: { public: true },
    },
    {
      path: ROUTE_PATH.ROLE_DETAIL,
      name: ROUTE_NAME.ROLE_DETAIL,
      component: RoleDetailView,
      meta: { public: true },
    },
    {
      path: ROUTE_PATH.SIMULATOR,
      name: ROUTE_NAME.SIMULATOR,
      component: SimulatorView,
      meta: { simulator: true, public: true },
    },
  ]

  const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior: (to, _from, savedPosition) => {
      if (savedPosition) return savedPosition
      if (to.hash) return { el: to.hash }
      return { top: 0 }
    },
  })

  router.beforeEach(async (to) => {
    if (!to.meta.requiresSession) return true

    const lobby = useLobbyStore(pinia)
    await lobby.initialize()
    if (!lobby.hasSession) return { name: ROUTE_NAME.HOME }

    const destinationRouteName = routeNameForDestination(lobby.destination)
    if (to.name !== destinationRouteName) {
      return { name: destinationRouteName }
    }
    return true
  })

  return router
}
