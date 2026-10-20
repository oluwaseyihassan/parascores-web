// Enums
export enum Role {
  USER = "USER",
  ORGANIZER = "ORGANIZER",
  SUPER_ADMIN = "SUPER_ADMIN",
}

export enum OrganizationRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export enum Visibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
  UNLISTED = "UNLISTED",
}

export enum TournamentType {
  KNOCKOUT = "KNOCKOUT",
  LEAGUE = "LEAGUE",
  ROUND_ROBIN = "ROUND_ROBIN",
  GROUP = "GROUP",
  FRIENDLY = "FRIENDLY",
  HYBRID = "HYBRID",
  RACE = "RACE",
}

export enum ParticipantType {
  INDIVIDUAL = "INDIVIDUAL",
  TEAM = "TEAM",
}

export enum ParticipantStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  DECLINED = "DECLINED",
  DISQUALIFIED = "DISQUALIFIED",
}

export enum PlayerStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum FixtureStatus {
  SCHEDULED = "SCHEDULED",
  LIVE = "LIVE",
  NORMAL_TIME_ENDED = "NORMAL_TIME_ENDED",
  EXTRATIME = "EXTRATIME",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum FixtureStage {
  GROUP_STAGE = "GROUP_STAGE",
  KNOCKOUT = "KNOCKOUT",
}

export enum MatchEventType {
  GOAL = "GOAL",
  OWN_GOAL = "OWN_GOAL",
  PENALTY = "PENALTY",
  MISSED_PENALTY = "MISSED_PENALTY",
  YELLOW_CARD = "YELLOW_CARD",
  RED_CARD = "RED_CARD",
  SUBSTITUTION = "SUBSTITUTION",
  ASSIST = "ASSIST",
  PENALTY_SAVE = "PENALTY_SAVE",
}

export enum MatchHalf {
  FIRST_HALF = "FIRST_HALF",
  SECOND_HALF = "SECOND_HALF",
  EXTRA_TIME = "EXTRA_TIME",
  PENALTY_SHOOTOUT = "PENALTY_SHOOTOUT",
}

export enum LivestreamPlatform {
  YOUTUBE = "YOUTUBE",
  TWITCH = "TWITCH",
  FACEBOOK = "FACEBOOK",
  VIMEO = "VIMEO",
  TIKTOK = "TIKTOK",
  INSTAGRAM = "INSTAGRAM",
  X = "X",
  KICK = "KICK",
  CUSTOM = "CUSTOM",
}

export enum HighlightPlatform {
  YOUTUBE_SHORTS = "YOUTUBE_SHORTS",
  INSTAGRAM_REEL = "INSTAGRAM_REEL",
  TIKTOK = "TIKTOK",
}

// Models
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string | null;

  // role is strictly typed to the Enum
  role: Role;
  isVerified?: boolean;
  metadata?: Record<string, any> | null;

  // Relations
  organizations?: OrganizationMember[];
  player_profiles?: Player[];
  followed_competitions?: CompetitionFollower[];

  // Email Verification
  isEmailVerified: boolean;
  emailVerificationToken?: string | null;
  emailVerificationExpiry?: string | null;

  // Password Reset
  passwordResetToken?: string | null;
  passwordResetExpiry?: string | null;
  hasPassword?: boolean;

  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  phone?: string | null;

  location?: string | null;
  website?: string | null;
  isVerified: boolean;
  created_at: string;
  updated_at: string;

  members?: OrganizationMember[];
  tournaments?: Tournament[];
  competitions?: Competition[];
  socials?: Social[];
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  organization?: Organization;
  userId: string;
  user?: User;
  role: OrganizationRole;
}

export interface Tournament {
  id: string;
  name: string;
  customName?: string | null;
  description?: string | null;

  // Branding
  logoUrl?: string | null;
  bannerUrl?: string | null;

  // Logistics
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone: string;
  visibility: Visibility;
  isPractice?: boolean;

  // Rules & Config
  sport: string;
  type: TournamentType;
  participantType: ParticipantType;
  scoringRules: Record<string, any>;

  // Registration
  maxParticipants?: number | null;
  registrationOpen?: string | null;
  registrationClose?: string | null;
  autoApprove: boolean;
  isPaidRegistration?: boolean;
  registrationFee?: number;
  isPinned?: boolean;
  isPremium?: boolean;

  // Esports package: chat + Paragee (AI bot) + score submissions
  chatEnabled?: boolean;
  chatRules?: string | null;
  parageeBot?: ParageeBotFlags | null;
  botCalls?: number;
  requiresScoreEvidence?: boolean;
  tournamentPrice?: number | null;
  paymentPerTeam?: number | null;
  pendingRequestsCount?: number;
  followerCount?: number;
  _count?: {
    followers?: number;
    participants?: number;
    groups?: number;
    standings?: number;
  };

  // Advanced Options
  twoLegsKnockout?: boolean;
  doubleRoundRobin?: boolean;
  thirdPlaceMatch?: boolean;
  unifiedStandings?: boolean;
  hasKnockoutPlayoffs?: boolean;

  // Venues
  venues?: Venue[];

  // Group config
  numberOfGroups?: number | null;
  teamsPerGroup?: number | null;

  // Seasons & Competitions
  seasonName?: string | null;
  parent_id?: string | null;
  competition_id?: string | null;
  isCurrentSeason?: boolean;

  // Relations
  groups?: Group[];
  standings?: Standing[];
  sponsors?: Sponsor[];
  socials?: Social[];
  parent?: Tournament | null;
  seasons?: Tournament[];
  competition?: Competition | null;

  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;

  organization_id?: string | null;
  organization?: Organization | null;
}

export interface Competition {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sport: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  organization_id: string;
  organization?: Organization;
  seasons?: Tournament[];
  followers?: CompetitionFollower[];
  _count?: {
    followers?: number;
    seasons?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface CompetitionFollower {
  userId: string;
  competitionId: string;
  createdAt: string;
  competition?: Competition;
  user?: User;
}

export interface Participant {
  id: string;
  tournament_id: string;
  user_id?: string | null;
  team_id?: string | null;

  customName?: string | null;
  customShortName?: string | null;
  logoUrl?: string | null;
  seed?: number | null;
  status: ParticipantStatus;

  groupId?: string | null;
  group?: Group | null;

  matchEvents?: MatchEvent[];
  standings?: Standing[];
  players?: Player[];

  created_at: string;
  updated_at: string;

  // Relations (optional/loaded)
  user?: User | null;
  team?: Team | null;
  tournament?: Tournament | null;
}

export interface ResultEntry {
  id: string;
  fixtureId: string;
  participantId: string;
  value: string;
  lane?: number | null;
  note?: string | null;
  rank?: number | null;
  participant?: {
    customName?: string | null;
    customShortName?: string | null;
    logoUrl?: string | null;
  } | null;
}

export interface Fixture {
  id: string;
  tournament_id: string;

  groupId?: string | null;
  group?: Group | null;

  round: number;
  roundName?: string | null;
  matchNumber: number;
  startTime?: string | null;
  timerStartedAt?: string | null;
  timerElapsedSeconds?: number | null;
  timerIsRunning?: boolean | null;
  matchDuration?: number;
  venue?: string | null;

  homeTeamId?: string | null;
  homeTeamPlaceholder?: string | null;
  awayTeamId?: string | null;
  awayTeamPlaceholder?: string | null;

  nextFixtureId?: string | null;

  homeScore?: number | null;
  awayScore?: number | null;
  homePenaltyScore?: number | null;
  awayPenaltyScore?: number | null;
  periodScores?: { home: number[]; away: number[] } | null;
  config?: Record<string, any> | null;
  resultEntries?: ResultEntry[];
  status: FixtureStatus;
  stage?: FixtureStage | null;
  half?: MatchHalf | null;

  created_at: string;
  updated_at: string;

  homeTeam?: Participant | null;
  awayTeam?: Participant | null;

  tournament?: Tournament | null;
  matchEvents?: MatchEvent[];
  lineupPlayers?: Player[];
  homeFormation?: string | null;
  awayFormation?: string | null;
  lineupPositions?: Record<string, string> | null;

  manOfTheMatchPlayerId?: string | null;
  manOfTheMatchPlayer?: Player | null;

  livestreamUrl?: string | null;
  livestreamPlatform?: LivestreamPlatform | string | null;
}

export interface Group {
  id: string;
  name: string;
  tournament_id: string;

  created_at: string;
  updated_at: string;

  // Relations
  tournament?: Tournament | null;
  participants?: Participant[];
  fixtures?: Fixture[];
}

export interface MatchEvent {
  id: string;
  fixture_id: string;
  participant_id?: string | null;
  relatedParticipant_id?: string | null;
  playerId?: string | null;
  relatedPlayerId?: string | null;

  type: MatchEventType;
  half?: MatchHalf | null;
  minute?: number | null;
  description?: string | null;
  metadata?: Record<string, any> | null;

  created_at: string;
  updated_at: string;

  // Relations
  fixture?: Fixture | null;
  participant?: Participant | null;
  relatedParticipant?: Participant | null;
  player?: Player | null;
  relatedPlayer?: Player | null;
}

export interface Standing {
  id: string;
  tournament_id: string;
  participant_id: string;

  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;

  position?: number | null;
  group?: string | null;

  created_at: string;
  updated_at: string;

  // Relations
  tournament?: Tournament | null;
  participant?: Participant | null;
}

export interface Team {
  id: string;
  name: string;
}

export interface Player {
  id: string;
  participantId: string;
  userId?: string | null;

  name: string;
  number?: number | null;
  position?: string | null;
  avatarUrl?: string | null;
  status: PlayerStatus;

  created_at: string;
  updated_at: string;

  // Relations
  participant?: Participant | null;
  matchEvents?: MatchEvent[];
  user?: User | null;
}

export interface Sponsor {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  tournament_id: string;

  created_at: string;
  updated_at: string;

  // Relations
  tournament?: Tournament | null;
}

export interface Social {
  id: string;
  platform: string;
  url: string;
  handle?: string | null;
  tournament_id?: string | null;
  organization_id?: string | null;

  created_at: string;
  updated_at: string;

  // Relations
  tournament?: Tournament | null;
  organization?: Organization | null;
}

export interface Venue {
  id: string;
  name: string;
  tournament_id: string;

  created_at: string;
  updated_at: string;

  // Relations
  tournament?: Tournament | null;
}

export interface Highlight {
  id: string;
  fixture_id: string;
  platform: HighlightPlatform;
  externalUrl: string;
  embedUrl: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  duration?: number | null;
  createdById: string;
  created_at: string;
  updated_at: string;
  fixture?: Fixture | null;
}

// Auth State
export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

// Chat (esports package)
export type ChatAuthorType = "USER" | "ORGANIZER" | "BOT" | "SYSTEM";
export type ChatCardType =
  | "FIXTURE"
  | "TABLE"
  | "STATS"
  | "LINK"
  | "SCORE_SUBMITTED"
  | "SCORE_CONFIRMED"
  | "SCORE_CONFLICT";

export interface ChatMessageAuthor {
  name: string;
  avatarUrl?: string | null;
  teamName?: string | null;
  participantId?: string | null;
}

export interface ChatReactionSummary {
  emoji: string;
  count: number;
  mine: boolean;
}

/** Fixed quick-reaction set (mirrors the server's whitelist). */
export const REACTION_EMOJIS = ['👍', '⚽', '🔥', '❤️', '😂', '🎉'] as const;

export interface ChatMessage {
  id: string;
  authorType: ChatAuthorType;
  text: string;
  cardType?: ChatCardType | null;
  cardPayload?: any;
  pinnedAt?: string | null;
  createdAt: string;
  author: ChatMessageAuthor;
  reactions?: ChatReactionSummary[];
  // Quoted reply target (null text = original was deleted)
  replyTo?: {
    id: string;
    authorName: string;
    deleted: boolean;
    text: string | null;
  } | null;
}

export interface ParageeBotFlags {
  enabled?: boolean;
  fixtures?: boolean;
  standings?: boolean;
  rules?: boolean;
  quickChips?: boolean;
  llm?: boolean;
}

export interface ChatSettings {
  chatEnabled: boolean;
  chatRules?: string | null;
  parageeBot?: ParageeBotFlags | null;
}

// Stats
export interface PlayerStatItem {
  player: { id: string; name: string; number?: number | null };
  teamName: string;
  teamLogoUrl?: string | null;
  count: number;
}

export interface PlayerStatsResponse {
  topScorers: PlayerStatItem[];
  topAssists: PlayerStatItem[];
}

export interface TeamInvite {
  id: string;
  token: string;
  participant_id: string;
  tournament_id: string;
  createdById: string;
  maxUses?: number | null;
  usedCount: number;
  expiresAt?: string | null;
  isActive: boolean;
  created_at: string;
  updated_at: string;

  // Computed by API
  isValid?: boolean;
  isExpired?: boolean;
  isMaxedOut?: boolean;

  // Relations
  participant?: Participant | null;
  tournament?: Tournament | null;
  createdBy?: Partial<User> | null;
}

export interface TournamentInvite {
  id: string;
  token: string;
  tournament_id: string;
  createdById: string;
  maxUses?: number | null;
  usedCount: number;
  expiresAt?: string | null;
  isActive: boolean;
  created_at: string;
  updated_at: string;

  // Computed by API
  isValid?: boolean;
  isExpired?: boolean;
  isMaxedOut?: boolean;

  // Relations
  tournament?: Tournament | null;
  createdBy?: Partial<User> | null;
}

// API Responses
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T | null;
  timestamp: string;
  error?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

declare global {
  interface NotificationOptions {
    renotify?: boolean;
    image?: string;
    vibrate?: number | number[];
    actions?: Array<{
      action: string;
      title: string;
      icon?: string;
    }>;
  }
}
