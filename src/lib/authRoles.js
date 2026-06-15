const ROLE_ADMIN = 'admin'
const ROLE_PARTNER = 'parceiro'
const ROLE_STUDENT = 'aluno'

export function normalizeRole(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function isAdminRole(role) {
  return normalizeRole(role) === ROLE_ADMIN
}

export function isPartnerRole(role) {
  return normalizeRole(role) === ROLE_PARTNER
}

export function isStudentRole(role) {
  return normalizeRole(role) === ROLE_STUDENT
}

export function isKnownRole(role) {
  return isAdminRole(role) || isPartnerRole(role) || isStudentRole(role)
}

export function isSupportedRole(role) {
  return isKnownRole(role)
}

export function isAllowedRole(role, allowedRoles = []) {
  const normalizedRole = normalizeRole(role)
  if (!normalizedRole) return false

  return allowedRoles.some((allowedRole) => normalizeRole(allowedRole) === normalizedRole)
}

export function getHomePathByRole(role) {
  if (isPartnerRole(role)) {
    return '/portal-parceiro'
  }

  if (isAdminRole(role)) {
    return '/dashboard'
  }

  if (isStudentRole(role)) {
    return '/portal-aluno'
  }

  return '/login'
}

export { ROLE_ADMIN, ROLE_PARTNER, ROLE_STUDENT }
