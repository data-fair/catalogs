import { mongoPagination, mongoProjection, mongoSort, type SessionStateAuthenticated } from '@data-fair/lib-express'
import { httpError } from '@data-fair/lib-utils/http-errors.js'

// Util functions shared accross the main find (GET on collection) endpoints
const query = (reqQuery: Record<string, string>, sessionState: SessionStateAuthenticated) => {
  const query: Record<string, any> = {}

  if (reqQuery.q) query.$text = { $search: reqQuery.q }

  const showAll = reqQuery.showAll === 'true'
  if (showAll && !sessionState.user.adminMode) {
    throw httpError(400, 'Only super admins can override permissions filter with showAll parameter')
  }
  if (!showAll) {
    query.owner = {
      'owner.type': sessionState.account.type,
      'owner.id': sessionState.account.id
    }
    if (sessionState.account.department) query.owner.department = sessionState.account.department
  }

  return query
}

export default {
  query,
  sort: mongoSort,
  pagination: mongoPagination,
  project: mongoProjection
}
