// Enums
export enum Role {
  USER = 'USER',
  ORGANIZER = 'ORGANIZER',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum Visibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  UNLISTED = 'UNLISTED'
}

export enum TournamentType {
  KNOCKOUT = 'KNOCKOUT',
  LEAGUE = 'LEAGUE',
  ROUND_ROBIN = 'ROUND_ROBIN'
}

export enum ParticipantType {
  INDIVIDUAL = 'INDIVIDUAL',
  TEAM = 'TEAM'
}

export enum ParticipantStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  DECLINED = 'DECLINED',
  DISQUALIFIED = 'DISQUALIFIED'
}

export enum FixtureStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Models
export interface User {
  id: string
  email: string
  name: string
  picture?: string | null
  
  // role is strictly typed to the Enum
  role: Role
  metadata?: Record<string, any> | null

  // Branding
  organization_name?: string | null
  organization_logo?: string | null
  organization_color?: string | null

  created_at: string
  updated_at: string
}

export interface Tournament {
  id: string
  name: string
  description?: string | null

  // Branding
  logoUrl?: string | null
  bannerUrl?: string | null

  // Logistics
  location?: string | null
  timezone: string
  visibility: Visibility

  // Rules & Config
  sport: string
  type: TournamentType
  participantType: ParticipantType
  scoringRules: Record<string, any>

  // Registration
  maxParticipants?: number | null
  registrationOpen?: string | null
  registrationClose?: string | null
  autoApprove: boolean

  start_date: string
  end_date: string
  created_at: string
  updated_at: string

  organizer_id?: string | null
  organizer?: User | null
}

export interface Participant {
  id: string
  tournament_id: string
  user_id?: string | null
  team_id?: string | null
  
  customName?: string | null
  seed?: number | null
  status: ParticipantStatus

  created_at: string
  updated_at: string
  
  // Relations (optional/loaded)
  user?: User | null
  tournament?: Tournament | null
}

export interface Fixture {
  id: string
  tournament_id: string
  
  round: number
  matchNumber: number
  startTime?: string | null

  homeTeamId?: string | null
  awayTeamId?: string | null

  homeScore?: number | null
  awayScore?: number | null
  status: FixtureStatus

  created_at: string
  updated_at: string

  // Relations
  homeTeam?: Participant | null
  awayTeam?: Participant | null
}

export interface Team {
  id: string
  name: string
}

// Auth State
export interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
}
