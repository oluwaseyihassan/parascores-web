export interface HubSport {
  e: string
  name: string
  status: string
  detail: string
  tournamentId?: string
}

export interface MedalRow {
  u: string
  host?: boolean
  logoUrl?: string | null
  g: number
  s: number
  b: number
}

export interface ScheduleItem {
  t: string
  e: string
  title: string
  sub: string
  status: string
  cls: string
}

export interface MatchEventRow {
  min: string
  icon: string
  text: string
}

export const hubMeta = {
  name: 'WAUG 2026',
  location: 'Ile-Ife',
  venue: 'Obafemi Awolowo University',
  dates: '2–12 October 2026',
  tagline: '16 disciplines · 24 universities · 10 days',
  dayIndicator: 'LIVE · DAY 6',
  countdownTarget: '2026-10-12T21:00:00+01:00',
  countdownLabel: 'until the closing ceremony',
  logo: '/images/event/waug-2026-logo.png',
  mascot: '/images/event/waug-2026-mascot-cutout.webp',
  mascotHead: '/images/event/waug-2026-mascot-head.webp',
  parascoresLogo: '/images/event/parascores-logo.png',
}

export const sports: HubSport[] = [
  { e: '⚽', name: 'Football', status: 'LIVE', detail: 'football' },
  { e: '🏀', name: 'Basketball', status: 'LIVE', detail: 'basketball' },
  { e: '🏃', name: 'Athletics', status: 'RESULTS', detail: 'athletics' },
  { e: '🏊', name: 'Swimming', status: 'RESULTS', detail: 'swimming' },
  { e: '🏐', name: 'Volleyball', status: 'RESULTS', detail: 'volleyball' },
  { e: '🥊', name: 'Boxing', status: 'RESULTS', detail: 'boxing' },
  { e: '🏓', name: 'Table Tennis', status: 'TODAY 16:00', detail: 'generic' },
  { e: '🏸', name: 'Badminton', status: 'TODAY 16:00', detail: 'generic' },
  { e: '🎾', name: 'Tennis', status: 'TOMORROW', detail: 'generic' },
  { e: '🤾', name: 'Handball', status: 'RESULTS', detail: 'generic' },
  { e: '🥋', name: 'Judo', status: 'TOMORROW', detail: 'generic' },
  { e: '🦵', name: 'Taekwondo', status: 'TOMORROW', detail: 'generic' },
  { e: '🏋️', name: 'Weightlifting', status: 'OCT 9', detail: 'generic' },
  { e: '🤼', name: 'Wrestling', status: 'OCT 9', detail: 'generic' },
  { e: '🚴', name: 'Cycling', status: 'OCT 10', detail: 'generic' },
  { e: '🏉', name: 'Rugby', status: 'OCT 10', detail: 'generic' },
]

export const medals: MedalRow[] = [
  { u: 'OAU', host: true, g: 14, s: 9, b: 11 },
  { u: 'University of Ibadan', g: 11, s: 12, b: 8 },
  { u: 'UNILAG', g: 9, s: 7, b: 10 },
  { u: 'ABU Zaria', g: 7, s: 6, b: 9 },
  { u: 'UNILORIN', g: 6, s: 8, b: 5 },
  { u: 'University of Ghana', g: 5, s: 4, b: 6 },
  { u: 'UNIBEN', g: 4, s: 5, b: 4 },
  { u: 'Covenant University', g: 3, s: 3, b: 5 },
  { u: 'FUTA', g: 3, s: 2, b: 4 },
  { u: 'LASU', g: 2, s: 3, b: 3 },
  { u: 'University of Jos', g: 2, s: 2, b: 3 },
  { u: 'UNIUYO', g: 2, s: 1, b: 3 },
  { u: 'UNN', g: 1, s: 2, b: 3 },
  { u: 'FUTMinna', g: 1, s: 2, b: 2 },
  { u: 'University of Cape Coast', g: 1, s: 1, b: 3 },
  { u: 'OOU', g: 1, s: 1, b: 2 },
  { u: 'Babcock', g: 1, s: 0, b: 2 },
  { u: 'UNIZIK', g: 0, s: 2, b: 2 },
  { u: 'UNIPORT', g: 0, s: 1, b: 2 },
  { u: 'FUNAAB', g: 0, s: 1, b: 1 },
  { u: 'UDUS', g: 0, s: 0, b: 2 },
  { u: 'ATBU', g: 0, s: 0, b: 1 },
  { u: 'UNIMAID', g: 0, s: 0, b: 1 },
  { u: 'UILC', g: 0, s: 0, b: 1 },
]

export const schedule: ScheduleItem[] = [
  { t: '16:00', e: '🏓', title: "Table Tennis — Men's Team Semi-Finals", sub: 'OAU vs UNIBEN · UI vs UG · Sports Hall B', status: 'SCHEDULED', cls: 'text-sky-400' },
  { t: '17:30', e: '🏸', title: 'Badminton — Mixed Doubles Final', sub: 'UNILAG vs Covenant · Sports Hall A', status: 'SCHEDULED', cls: 'text-sky-400' },
  { t: '19:00', e: '⚽', title: "Football — Women's Gold Medal Match", sub: 'OAU vs UG · Main Stadium', status: 'PRIMETIME', cls: 'text-amber-400' },
  { t: '19:30', e: '🏊', title: "Swimming — Men's 4×100m Relay Final", sub: 'Aquatics Centre', status: 'SCHEDULED', cls: 'text-sky-400' },
  { t: '20:00', e: '🥊', title: 'Boxing — 71kg Final', sub: 'M. Abdullahi (ABU) vs E. Osei (UG) · Arena 2', status: 'SCHEDULED', cls: 'text-sky-400' },
]

export const tickerItems: string[] = [
  "🔴 LIVE · Football SF: OAU 2–1 UNILAG (78')",
  '🔴 LIVE · Basketball: UNIBEN 64–61 UI (Q4 3:12)',
  "🏁 Athletics: Men's 100m Final — OAU takes GOLD (10.42s)",
  '🏊 Swimming: 200m Freestyle — UI sweeps gold & silver',
  '🥊 Boxing 71kg SF: ABU advances on split decision',
  '🏐 Volleyball: UNILORIN beat Covenant 3–1',
]

export const footballMatch = {
  label: "⚽ Football · Men's Semi-Final · Main Stadium",
  home: { abbr: 'OAU', name: 'OAU', color: '#1e3a8a' },
  away: { abbr: 'UL', name: 'UNILAG', color: '#991b1b' },
  hs: 2,
  as: 1,
  clock: "78'",
  clockLabel: 'SECOND HALF',
  lastEvent: "Latest: ⚽ D. Eze (OAU) 67'",
  stats: [
    { label: 'Possession', value: '54–46' },
    { label: 'Shots', value: '11–7' },
    { label: 'Corners', value: '5–2' },
  ],
  events: [
    { min: "12'", icon: '⚽', text: 'A. Adeyemi (OAU) — assist K. Bello' },
    { min: "34'", icon: '⚽', text: 'T. Okafor (UNILAG) — penalty' },
    { min: "45+2'", icon: '🟨', text: 'M. Suleiman (UNILAG)' },
    { min: "67'", icon: '⚽', text: 'D. Eze (OAU)' },
    { min: "71'", icon: '🔄', text: 'OAU: F. Musa ⇄ A. Adeyemi' },
  ] as MatchEventRow[],
}

export const basketballMatch = {
  label: "🏀 Basketball · Men's Bronze Medal Game · Sports Hall A",
  home: { abbr: 'UB', name: 'UNIBEN', color: '#065f46' },
  away: { abbr: 'UI', name: 'UI', color: '#075985' },
  hs: 64,
  as: 61,
  clock: 'Q4 · 3:12',
  lastEvent: 'Latest: J. Akindele 2+1 (UNIBEN)',
  quarters: {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    home: [18, 15, 17, 14],
    away: [16, 19, 12, 14],
  },
  topScorer: 'Top scorer: J. Akindele (UNIBEN) — 21 pts, 7 reb',
}

export interface RaceResultRow {
  lane: number
  athlete: string
  uni: string
  time: string
  medal?: 'g' | 's' | 'b'
  bold?: boolean
}

export const athleticsResult = {
  title: "Men's 100m — Final · Official Result",
  note: 'Wind +0.4 m/s · Photo-finish verified · Heats & semis available',
  rows: [
    { lane: 4, athlete: '🥇 Chukwuemeka Obi', uni: 'OAU', time: '10.42 PB', medal: 'g' },
    { lane: 6, athlete: '🥈 Femi Adebayo', uni: 'UI', time: '10.51', medal: 's' },
    { lane: 2, athlete: '🥉 Kwame Mensah', uni: 'UG', time: '10.58', medal: 'b' },
    { lane: 5, athlete: 'Ibrahim Lawal', uni: 'ABU', time: '10.64' },
    { lane: 3, athlete: 'Tunde Bakare', uni: 'UNILAG', time: '10.71' },
  ] as RaceResultRow[],
}

export const swimmingResult = {
  title: "Women's 200m Freestyle — Final · Official Result",
  note: 'GR = Games Record · Splits per 50m available',
  rows: [
    { lane: 5, athlete: '🥇 Adaeze Okonkwo', uni: 'UI', time: '2:03.44 GR', medal: 'g' },
    { lane: 3, athlete: '🥈 Ngozi Eze', uni: 'UI', time: '2:05.12', medal: 's' },
    { lane: 4, athlete: '🥉 Aisha Bello', uni: 'OAU', time: '2:06.87', medal: 'b' },
    { lane: 6, athlete: 'Funke Adeleke', uni: 'UNILAG', time: '2:08.30' },
  ] as RaceResultRow[],
}

export const volleyballResult = {
  title: "Women's Final · Full Time",
  home: 'UNILORIN',
  away: 'Covenant',
  score: '3–1',
  sets: ['25–21', '23–25', '25–19', '25–17'],
  medals: '🥇 UNILORIN · 🥈 Covenant · 🥉 OAU',
}

export const boxingBracket = {
  title: '71kg — Bracket',
  bouts: [
    { name: 'M. Abdullahi (ABU)', result: 'SD', winner: true },
    { name: 'P. Nwachukwu (UI)', result: '—', winner: false },
    { name: 'E. Osei (UG)', result: 'KO R2', winner: true },
    { name: 'D. Adeleke (OAU)', result: '—', winner: false },
  ],
  final: { label: 'FINAL: Abdullahi vs Osei', when: 'OCT 8 · 19:00' },
}
