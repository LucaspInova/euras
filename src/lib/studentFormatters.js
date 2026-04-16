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
  const normalized = (value ?? '').replace(/\D/g, '')
  return normalized ? Number(normalized) : 0
}

export function centsToBalance(valueInCents) {
  const safeValue = Math.max(0, Number(valueInCents) || 0)
  const integerPart = Math.floor(safeValue / 100)
  const decimalPart = String(safeValue % 100).padStart(2, '0')
  return `${integerPart},${decimalPart}`
}
