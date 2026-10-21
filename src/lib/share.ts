/** Share helpers for the viewer. */

export function situationUrl(slug: string): string {
  return `${window.location.origin}/s/${slug}`
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

/**
 * Shares via the Web Share API when available (phones), otherwise opens WhatsApp.
 * Returns 'shared', 'whatsapp' or 'cancelled'.
 */
export async function shareSituation(title: string, url: string): Promise<'shared' | 'whatsapp' | 'cancelled'> {
  const text = `${title} – ${url}`
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text: title, url })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  window.open(whatsappUrl(text), '_blank', 'noopener')
  return 'whatsapp'
}
