import type { CompetitionEdition, CompetitionEditionStatus } from '~/types'

export function getEditionLabel(edition: Pick<CompetitionEdition, 'name' | 'seasonName' | 'start_date'>): string {
  if (edition.seasonName) return edition.seasonName
  if (edition.start_date) {
    const year = new Date(edition.start_date).getFullYear()
    if (!Number.isNaN(year)) return `${year} Edition`
  }
  return edition.name
}

export function getShortEditionLabel(edition: Pick<CompetitionEdition, 'name' | 'seasonName' | 'start_date'>): string {
  if (edition.seasonName) return edition.seasonName
  if (edition.start_date) {
    const year = new Date(edition.start_date).getFullYear()
    if (!Number.isNaN(year)) return String(year)
  }
  return edition.name
}

export function formatEditionDateRange(start?: string | null, end?: string | null): string {
  if (!start || !end) return ''
  const s = new Date(start)
  const e = new Date(end)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return ''

  const fmt = (d: Date, includeYear: boolean) =>
    d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(includeYear ? { year: 'numeric' } : {}),
    })

  const sameYear = s.getFullYear() === e.getFullYear()
  return `${fmt(s, !sameYear)} – ${fmt(e, true)}`
}

export function getEditionStatusMeta(status?: CompetitionEditionStatus): {
  label: string
  badgeClass: string
  badgeColor: 'error' | 'info' | 'neutral'
} {
  if (status === 'live') {
    return {
      label: 'Live',
      badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      badgeColor: 'error',
    }
  }
  if (status === 'upcoming') {
    return {
      label: 'Upcoming',
      badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      badgeColor: 'info',
    }
  }
  return {
    label: 'Completed',
    badgeClass: 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-neutral-400 border-subtle',
    badgeColor: 'neutral',
  }
}

export function formatEditionMetadata(edition: CompetitionEdition): string[] {
  const parts: string[] = []
  const label = getEditionLabel(edition)
  if (edition.name && edition.name !== label) {
    parts.push(edition.name)
  }
  const dates = formatEditionDateRange(edition.start_date, edition.end_date)
  if (dates) {
    parts.push(dates)
  }
  const count = edition._count?.participants
  if (count != null) {
    parts.push(`${count} ${count === 1 ? 'participant' : 'participants'}`)
  }
  if (edition.visibility) {
    const v = edition.visibility.toLowerCase()
    parts.push(v.charAt(0).toUpperCase() + v.slice(1))
  }
  return parts
}
