import {
  ERROR_CODE,
  type PublicError,
} from '@lgu/contracts'

import { LobbyError } from '../domain/lobby-error'

const INTERNAL_ERROR_MESSAGE = 'Une erreur interne est survenue.'
const INVALID_PAYLOAD_MESSAGE = 'La requête est invalide.'

export function toPublicError(error: unknown): PublicError {
  if (error instanceof LobbyError) {
    return { code: error.code, message: error.message }
  }

  return {
    code: ERROR_CODE.INTERNAL_ERROR,
    message: INTERNAL_ERROR_MESSAGE,
  }
}

export function invalidPayloadError(): PublicError {
  return {
    code: ERROR_CODE.INVALID_PAYLOAD,
    message: INVALID_PAYLOAD_MESSAGE,
  }
}

export function getHttpStatus(error: PublicError): number {
  switch (error.code) {
    case ERROR_CODE.INVALID_ROLE_TOKEN:
    case ERROR_CODE.PLAYER_NOT_FOUND:
    case ERROR_CODE.SESSION_NOT_FOUND:
      return 404
    case ERROR_CODE.LOBBY_CLOSED:
    case ERROR_CODE.GAME_ALREADY_STARTED:
    case ERROR_CODE.GAME_NOT_STARTED:
      return 409
    case ERROR_CODE.INTERNAL_ERROR:
      return 500
    default:
      return 400
  }
}
