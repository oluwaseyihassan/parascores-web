import type { Participant } from '~/types'

export function getParticipantName(
  participant: Participant | null | undefined,
  fallback: string = 'TBD'
): string {
  return participant?.customShortName
    || participant?.customName
    || participant?.user?.name
    || participant?.team?.name
    || fallback
}

export function getParticipantInitial(participant: Participant | null | undefined): string {
  const name = participant?.customShortName || participant?.customName || 'T'
  return name.trim().charAt(0).toUpperCase()
}
