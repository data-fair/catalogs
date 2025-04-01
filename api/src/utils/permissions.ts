import type { SessionStateAuthenticated, Account } from '@data-fair/lib-express'

const getOwnerRole = (sessionState: SessionStateAuthenticated, owner: Account) => {
  if (!sessionState) return null
  if (sessionState.account.type !== owner.type || sessionState.account.id !== owner.id) return null
  if (sessionState.account.type === 'user') return 'admin'
  if (sessionState.account.department && sessionState.account.department !== owner.department) return null
  return sessionState.accountRole
}

const isAdmin = (sessionState: SessionStateAuthenticated, owner: Account): boolean => {
  return (!!sessionState.user.adminMode || getOwnerRole(sessionState, owner) === 'admin')
}

const isContrib = (sessionState: SessionStateAuthenticated, owner: Account) => {
  return (!!sessionState.user.adminMode || ['admin', 'contrib'].includes(getOwnerRole(sessionState, owner) || ''))
}

export default {
  getOwnerRole,
  isAdmin,
  isContrib
}
