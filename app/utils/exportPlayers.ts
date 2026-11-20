import type { Participant, Player } from '~/types'
import { ParticipantType } from '~/types'

function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .replace(/\s+/g, '_')
  return cleaned || 'Tournament'
}

function formatDateCell(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0] || ''
}

function buildColumnWidths(rows: (string | number)[][]) {
  if (!rows.length) return []
  const colCount = Math.max(...rows.map((r) => r.length))
  return Array.from({ length: colCount }, (_, colIdx) => {
    const maxLen = rows.reduce((max, row) => {
      const cell = row[colIdx]
      const len = cell != null ? String(cell).length : 0
      return Math.max(max, len)
    }, 8)
    return { wch: Math.min(maxLen + 3, 40) }
  })
}

async function writeWorkbook(rows: (string | number)[][], sheetName: string, filename: string) {
  const xlsx = await import('xlsx')
  const ws = xlsx.utils.aoa_to_sheet(rows)
  ws['!cols'] = buildColumnWidths(rows)
  const wb = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(wb, ws, sheetName)
  xlsx.writeFile(wb, filename)
}

function mapPlayerRow(player: Player, teamName?: string): (string | number)[] {
  const base: (string | number)[] = [
    player.name || '',
    player.number ?? '',
    player.position || '',
    player.status || '',
    player.userId ? 'Yes' : 'No',
    formatDateCell(player.created_at),
  ]
  return teamName !== undefined ? [teamName, ...base] : base
}

/**
 * Export a single team's player roster to an .xlsx file.
 * Uses Name, Number, Position headers compatible with the bulk uploader.
 */
export async function exportTeamPlayersToExcel(
  teamName: string,
  players: Player[],
): Promise<number> {
  if (!players.length) return 0

  const sorted = [...players].sort((a, b) => {
    const numA = a.number ?? Number.MAX_SAFE_INTEGER
    const numB = b.number ?? Number.MAX_SAFE_INTEGER
    if (numA !== numB) return numA - numB
    return (a.name || '').localeCompare(b.name || '')
  })

  const rows: (string | number)[][] = [
    ['Name', 'Number', 'Position', 'Status', 'Profile Linked', 'Added Date'],
    ...sorted.map((player) => mapPlayerRow(player)),
  ]

  await writeWorkbook(rows, 'Players', `${sanitizeFilename(teamName)}_Players.xlsx`)
  return sorted.length
}

/**
 * Export all players across a tournament's participants to an .xlsx file.
 */
export async function exportTournamentPlayersToExcel(
  tournamentName: string,
  participants: Participant[],
  participantType?: ParticipantType,
): Promise<number> {
  if (participantType === ParticipantType.INDIVIDUAL) {
    if (!participants.length) return 0
    const sorted = [...participants].sort((a, b) =>
      (a.customName || a.user?.name || '').localeCompare(b.customName || b.user?.name || ''),
    )
    const rows: (string | number)[][] = [
      ['Name', 'Seed', 'Status', 'Profile Linked', 'Joined Date'],
      ...sorted.map((p) => [
        p.customName || p.user?.name || 'Unnamed',
        p.seed ?? '',
        p.status || '',
        p.user_id ? 'Yes' : 'No',
        formatDateCell(p.created_at),
      ]),
    ]
    await writeWorkbook(rows, 'Players', `${sanitizeFilename(tournamentName)}_Players.xlsx`)
    return sorted.length
  }

  const collected: { teamName: string; player: Player }[] = []
  for (const participant of participants) {
    const teamName = participant.customName || participant.team?.name || 'Unnamed Team'
    for (const player of participant.players || []) {
      collected.push({ teamName, player })
    }
  }

  if (!collected.length) return 0

  collected.sort((a, b) => {
    const teamCmp = a.teamName.localeCompare(b.teamName)
    if (teamCmp !== 0) return teamCmp
    const numA = a.player.number ?? Number.MAX_SAFE_INTEGER
    const numB = b.player.number ?? Number.MAX_SAFE_INTEGER
    if (numA !== numB) return numA - numB
    return (a.player.name || '').localeCompare(b.player.name || '')
  })

  const rows: (string | number)[][] = [
    ['Team', 'Name', 'Number', 'Position', 'Status', 'Profile Linked', 'Added Date'],
    ...collected.map(({ teamName, player }) => mapPlayerRow(player, teamName)),
  ]

  await writeWorkbook(rows, 'Players', `${sanitizeFilename(tournamentName)}_Players.xlsx`)
  return collected.length
}
