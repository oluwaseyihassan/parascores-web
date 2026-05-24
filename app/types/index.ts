// Enums
export enum Role {
  USER = 'USER',
  ORGANIZER = 'ORGANIZER',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum OrganizationRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

export enum Visibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  UNLISTED = 'UNLISTED'
}

export enum TournamentType {
  KNOCKOUT = 'KNOCKOUT',
  LEAGUE = 'LEAGUE',
  ROUND_ROBIN = 'ROUND_ROBIN',
  GROUP = 'GROUP',
  FRIENDLY = 'FRIENDLY',
  HYBRID = 'HYBRID'
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

export enum PlayerStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum FixtureStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum FixtureStage {
  GROUP_STAGE = 'GROUP_STAGE',
  KNOCKOUT = 'KNOCKOUT'
}

export enum MatchEventType {
  GOAL = 'GOAL',
  OWN_GOAL = 'OWN_GOAL',
  PENALTY = 'PENALTY',
  MISSED_PENALTY = 'MISSED_PENALTY',
  YELLOW_CARD = 'YELLOW_CARD',
  RED_CARD = 'RED_CARD',
  SUBSTITUTION = 'SUBSTITUTION',
  ASSIST = 'ASSIST'
}

// Models
export interface User {
  id: string
  email: string
  name: string
  picture?: string | null
  
  // role is strictly typed to the Enum
  role: Role
  isVerified?: boolean
  metadata?: Record<string, any> | null

  // Relations
  organizations?: OrganizationMember[]
  player_profiles?: Player[]

  // Email Verification
  isEmailVerified: boolean
  emailVerificationToken?: string | null
  emailVerificationExpiry?: string | null
  
  // Password Reset
  passwordResetToken?: string | null
  passwordResetExpiry?: string | null
  hasPassword?: boolean

  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  description?: string | null
  logoUrl?: string | null
  bannerUrl?: string | null
  phone?: string | null

  location?: string | null
  website?: string | null
  isVerified: boolean
  created_at: string
  updated_at: string
  
  members?: OrganizationMember[]
  tournaments?: Tournament[]
  socials?: Social[]
}

export interface OrganizationMember {
  id: string
  organizationId: string
  organization?: Organization
  userId: string
  user?: User
  role: OrganizationRole
}

export interface Tournament {
  id: string
  name: string
  customName?: string | null
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
  isPaidRegistration?: boolean
  registrationFee?: number
  isPinned?: boolean
  isPremium?: boolean
  pendingRequestsCount?: number

   // Advanced Options
  twoLegsKnockout?: boolean
  doubleRoundRobin?: boolean
  thirdPlaceMatch?: boolean

  // Venues
  venues?: Venue[]

  // Group config
  numberOfGroups?: number | null
  teamsPerGroup?: number | null

  // Seasons
  seasonName?: string | null
  parent_id?: string | null

  // Relations
  groups?: Group[]
  standings?: Standing[]
  sponsors?: Sponsor[]
  socials?: Social[]
  parent?: Tournament | null
  seasons?: Tournament[]

  start_date: string
  end_date: string
  created_at: string
  updated_at: string

  organization_id?: string | null
  organization?: Organization | null
  
  _count?: {
    participants?: number
    groups?: number
    standings?: number
  }
}

export interface Participant {
  id: string
  tournament_id: string
  user_id?: string | null
  team_id?: string | null
  
  customName?: string | null
  logoUrl?: string | null
  seed?: number | null
  status: ParticipantStatus
  
  groupId?: string | null
  group?: Group | null
  
  matchEvents?: MatchEvent[]
  standings?: Standing[]
  players?: Player[]

  created_at: string
  updated_at: string
  
  // Relations (optional/loaded)
  user?: User | null
  team?: Team | null
  tournament?: Tournament | null
}

export interface Fixture {
  id: string
  tournament_id: string
  
  groupId?: string | null
  group?: Group | null
  
  round: number
  roundName?: string | null
  matchNumber: number
  startTime?: string | null
  venue?: string | null

  homeTeamId?: string | null
  homeTeamPlaceholder?: string | null
  awayTeamId?: string | null
  awayTeamPlaceholder?: string | null
  
  nextFixtureId?: string | null

  homeScore?: number | null
  awayScore?: number | null
  homePenaltyScore?: number | null
  awayPenaltyScore?: number | null
  status: FixtureStatus
  stage?: FixtureStage | null

  created_at: string
  updated_at: string

  homeTeam?: Participant | null
  awayTeam?: Participant | null
  
  tournament?: Tournament | null
  matchEvents?: MatchEvent[]
  lineupPlayers?: Player[]
}

export interface Group {
  id: string
  name: string
  tournament_id: string
  
  created_at: string
  updated_at: string
  
  // Relations
  tournament?: Tournament | null
  participants?: Participant[]
  fixtures?: Fixture[]
}

export interface MatchEvent {
  id: string
  fixture_id: string
  participant_id?: string | null
  relatedParticipant_id?: string | null
  playerId?: string | null
  relatedPlayerId?: string | null
  
  type: MatchEventType
  minute?: number | null
  description?: string | null
  metadata?: Record<string, any> | null
  
  created_at: string
  updated_at: string
  
  // Relations
  fixture?: Fixture | null
  participant?: Participant | null
  relatedParticipant?: Participant | null
  player?: Player | null
  relatedPlayer?: Player | null
}

export interface Standing {
  id: string
  tournament_id: string
  participant_id: string
  
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  
  position?: number | null
  group?: string | null
  
  created_at: string
  updated_at: string
  
  // Relations
  tournament?: Tournament | null
  participant?: Participant | null
}

export interface Team {
  id: string
  name: string
}

export interface Player {
  id: string
  participantId: string
  userId?: string | null
  
  name: string
  number?: number | null
  position?: string | null
  avatarUrl?: string | null
  status: PlayerStatus
  
  created_at: string
  updated_at: string
  
  // Relations
  participant?: Participant | null
  matchEvents?: MatchEvent[]
  user?: User | null
}

export interface Sponsor {
  id: string
  name: string
  description?: string | null
  logoUrl?: string | null
  websiteUrl?: string | null
  tournament_id: string
  
  created_at: string
  updated_at: string
  
  // Relations
  tournament?: Tournament | null
}

export interface Social {
  id: string
  platform: string
  url: string
  handle?: string | null
  tournament_id?: string | null
  organization_id?: string | null
  
  created_at: string
  updated_at: string
  
  // Relations
  tournament?: Tournament | null
  organization?: Organization | null
}

export interface Venue {
  id: string
  name: string
  tournament_id: string
  
  created_at: string
  updated_at: string
  
  // Relations
  tournament?: Tournament | null
}

// Auth State
export interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
}

// Stats
export interface PlayerStatItem {
  player: { id: string, name: string, number?: number | null }
  teamName: string
  teamLogoUrl?: string | null
  count: number
}

export interface PlayerStatsResponse {
  topScorers: PlayerStatItem[]
  topAssists: PlayerStatItem[]
}

export interface TeamInvite {
  id: string
  token: string
  participant_id: string
  tournament_id: string
  createdById: string
  maxUses?: number | null
  usedCount: number
  expiresAt?: string | null
  isActive: boolean
  created_at: string
  updated_at: string
  
  // Computed by API
  isValid?: boolean
  isExpired?: boolean
  isMaxedOut?: boolean

  // Relations
  participant?: Participant | null
  tournament?: Tournament | null
  createdBy?: Partial<User> | null
}

export interface TournamentInvite {
  id: string
  token: string
  tournament_id: string
  createdById: string
  maxUses?: number | null
  usedCount: number
  expiresAt?: string | null
  isActive: boolean
  created_at: string
  updated_at: string
  
  // Computed by API
  isValid?: boolean
  isExpired?: boolean
  isMaxedOut?: boolean

  // Relations
  tournament?: Tournament | null
  createdBy?: Partial<User> | null
}

// API Responses
export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T | null
  timestamp: string
  error?: number
}

export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  timestamp: string
}
