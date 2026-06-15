import { useEffect } from 'react'

export function useModalDismiss(isOpen, onDismiss, disabled = false) {
  useEffect(() => {
    if (!isOpen || disabled) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onDismiss()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [disabled, isOpen, onDismiss])
}
