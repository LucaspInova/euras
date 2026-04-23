export function formatPhoneInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11)

  if (digits.length <= 2) {
    return digits ? `(${digits}` : ''
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)})${digits.slice(2)}`
  }

  return `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function formatDateInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8)

  if (digits.length <= 2) {
    return digits
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export function formatBalanceInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 9)

  if (!digits) {
    return ''
  }

  if (digits.length === 1) {
    return `0,0${digits}`
  }

  if (digits.length === 2) {
    return `0,${digits}`
  }

  const integerPart = digits.slice(0, -2).replace(/^0+(\d)/, '$1') || '0'
  const decimalPart = digits.slice(-2)

  return `${integerPart},${decimalPart}`
}

export function balanceToCents(value) {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return 0
  }

  const normalized = raw.replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0
  }

  return Math.round(parsed)
}

export function centsToBalance(valueInCents) {
  const safeValue = Math.max(0, Number(valueInCents) || 0)
  return safeValue.toFixed(2).replace('.', ',')
}
