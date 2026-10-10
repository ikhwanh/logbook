import { localToday } from '@/processors/dates'

export function exportFilename(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'logbook'}-${localToday()}.json`
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  // Safari can start reading the blob after click() returns, so revoking right away may cancel it.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
