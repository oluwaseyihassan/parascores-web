
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import type { Fixture, Participant } from '~/types'
import { getSponsorsRow, getAbsoluteFooter } from '../../utils/graphics'
import { useGraphicsCache } from '../../utils/cache'

// Social Icons Map (Simple Icons & Heroicons)

// Helper types
interface BracketBody {
    tournament: any
    fixturesByRound: Record<number, Fixture[]>
    rounds: number[]
    sponsors?: any[]
    socials?: any[]
}

export default defineEventHandler(async (event) => {
  return useGraphicsCache(event, async (body: BracketBody) => {
  try {
    const { tournament, fixturesByRound, rounds, sponsors = [], socials = [] } = body

    if (!tournament || !fixturesByRound || !rounds || rounds.length === 0) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing bracket data'
        })
    }

    // Load Fonts
    let fontData: ArrayBuffer
    let regularFontData: ArrayBuffer

    try {
        const [boldRes, regRes] = await Promise.all([
            fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-700-normal.woff'),
            fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-400-normal.woff')
        ])
        
        if (!boldRes.ok || !regRes.ok) throw new Error('Failed to fetch fonts')
        
        fontData = await boldRes.arrayBuffer()
        regularFontData = await regRes.arrayBuffer()
    } catch (e) {
        console.warn('Failed to load remote fonts', e)
        throw createError({ statusCode: 500, statusMessage: 'Failed to load fonts' })
    }

    // Dimensions
    const matchHeight = 80 // Height of a single match card
    const matchGap = 20    // Gap between matches in round 1
    
    // Calculate total height based on Round 1 matches
    // Calculate total height based on Round 1 matches (increased buffer for footer)
    const round1Matches = fixturesByRound[rounds[0]]?.length || 0
    const contentHeight = Math.max(900, (round1Matches * (matchHeight + matchGap)) + 600) // +600 for header/padding/footer
    const contentWidth = Math.max(1200, (rounds.length * 350) + 100) // 350px per round col

    const height = contentHeight
    const width = contentWidth

    // Helpers for tree layout
    const getMatchVerticalPos = (roundIndex: number, matchIndex: number) => {
        // This calculates the center Y position of a match in the grid
        // Round 0: 0, 1, 2, 3... spaced by gap
        // Round 1: centered between (0,1), (2,3)...
        const span = Math.pow(2, roundIndex)
        // For visual calculation in pixels:
        // Position = (Start Offset) + (Index * Stride)
        // Stride = (MatchHeight + Gap) * 2^roundIndex
        // Offset = ?
        // Simpler approach: Just use flexbox with spacers? 
        // Satori flexbox is robust. Let's try to simulate the grid using nested flex columns.
        return 0
    }

    // Background Layers
    const backgroundLayers = []
    if (tournament.bannerUrl) {
        backgroundLayers.push({
          type: 'img',
          props: {
              src: tournament.bannerUrl,
              width: width,
              height: height,
              style: {
                  position: 'absolute',
                  top: 0, 0: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'blur(15px)',
                  transform: 'scale(1.1)',
                  opacity: 0.4
              }
          }
        })
    }
    // Gradient always on top
    backgroundLayers.push({
        type: 'div',
        props: {
            style: {
                position: 'absolute',
                top: 0, left: 0,
                width: '100%', height: '100%',
                background: `linear-gradient(135deg, #111827 0%, ${tournament.bannerUrl ? 'rgba(17,24,39,0.9)' : '#1f2937'} 100%)`
            }
        }
    })

    // Construct Columns
    const columns = rounds.map((round, rIndex) => {
        const fixtures = fixturesByRound[round] || []
        
        // Prepare match cards
        const matchCards = fixtures.map((fixture, mIndex) => {
            const home = fixture.homeTeam
            const away = fixture.awayTeam
            
            // Calculate spacing for this round
            // Round 1 (rIndex 0): gap is 1 unit
            // Round 2 (rIndex 1): gap scales
            // Actually, best way in Flex is to use `justify-content: space-around` for the column if we treat the whole height as fixed?
            // No, the height grows.
            // Absolute positioning is easiest for trees in Satori if we know the math.
            // Let's rely on margins.
            
            // Math:
            // R0 Spacing: 20px. 
            // Top Margin R0: 0. 
            // R1 Spacing: (80 + 20) * 2 - 80 = 120px? 
            // Better: use empty spacer blocks or just margin-bottom.
            
            // Let's try a computed margin approach.
            // Base gap = 20.
            // Round 0 matches are [Card] [20px] [Card] [20px]...
            // Round 1 matches are centered relative to R0 pairs.
            // Indent top: (MatchHeight + Gap) * (2^rIndex - 1) / 2 ?
            // Gap between: (MatchHeight + Gap) * 2^rIndex - MatchHeight
            
            const unit = matchHeight + matchGap
            const power = Math.pow(2, rIndex)
            const marginTop = mIndex === 0 ? (unit * (power - 1)) / 2 : 0
            const marginBottom = (unit * power) - matchHeight

            // Connector
            let connector = null
            if (rIndex < rounds.length - 1) {
                const offset = (unit * Math.pow(2, rIndex)) / 2
                const isTop = mIndex % 2 === 0
                
                connector = {
                    type: 'div',
                    props: {
                        style: {
                            position: 'absolute',
                            right: '-40px',
                            width: '40px',
                            height: `${offset}px`,
                            [isTop ? 'top' : 'bottom']: '40px',
                            display: 'flex'
                        },
                        children: [
                            {
                                type: 'svg',
                                props: {
                                    width: 40,
                                    height: offset,
                                    viewBox: `0 0 40 ${offset}`,
                                    children: [
                                        {
                                            type: 'path',
                                            props: {
                                                d: isTop 
                                                    ? `M0,0 H20 V${offset} H40`
                                                    : `M0,${offset} H20 V0 H40`,
                                                stroke: '#6b7280',
                                                strokeWidth: 2,
                                                fill: 'none'
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            }

            return {
                type: 'div',
                props: {
                    style: {
                        position: 'relative',
                        display: 'flex',
                        width: '280px',
                        height: `${matchHeight}px`,
                        marginTop: `${marginTop}px`,
                        marginBottom: `${marginBottom}px`
                    },
                    children: [
                        {
                            type: 'div',
                            props: {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: '#1f2937', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    overflow: 'hidden'
                                },
                                children: [
                                    // Home Team
                                    {
                                        type: 'div',
                                        props: {
                                            style: { flex: 1, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: '1px solid #374151', backgroundColor: getWinnerBg(fixture, true) },
                                            children: [
                                                { type: 'span', props: { style: { flex: 1, fontSize: '14px', fontWeight: 600, color: 'white', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }, children: getTeamName(fixture, true) } },
                                                { type: 'span', props: { style: { fontSize: '14px', fontWeight: 700, color: 'white' }, children: getScore(fixture, true) } }
                                            ]
                                        }
                                    },
                                    // Away Team
                                    {
                                        type: 'div',
                                        props: {
                                            style: { flex: 1, display: 'flex', alignItems: 'center', padding: '0 12px', backgroundColor: getWinnerBg(fixture, false) },
                                            children: [
                                                { type: 'span', props: { style: { flex: 1, fontSize: '14px', fontWeight: 600, color: 'white', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }, children: getTeamName(fixture, false) } },
                                                { type: 'span', props: { style: { fontSize: '14px', fontWeight: 700, color: 'white' }, children: getScore(fixture, false) } }
                                            ]
                                        }
                                    }
                                ]
                            }
                        },
                        ...(connector ? [connector] : [])
                    ]
                }
            }
        })
        
        return {
            type: 'div',
            props: {
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    marginRight: rIndex < rounds.length - 1 ? '40px' : '0' // Gap between columns
                },
                children: [
                            // Round Header
                            {
                                type: 'div',
                                props: {
                                    style: { display: 'flex', justifyContent: 'center', width: '100%', textAlign: 'center', color: '#9ca3af', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '20px' },
                                    children: (fixtures[0] as any)?.roundName || getRoundLabel(rIndex, rounds.length)
                                }
                            },
                    ...matchCards
                ]
            }
        }
    })


    const svg = await satori(
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            width: '100%',
            height: '100%',
            backgroundColor: '#111827',
            fontFamily: 'Inter',
            position: 'relative'
          },
          children: [
            ...backgroundLayers,
            // Header
            {
                type: 'div',
                props: {
                    style: {
                        position: 'absolute',
                        top: '40px',
                        left: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    },
                    children: [
                        tournament.logoUrl ? {
                            type: 'img',
                            props: { src: tournament.logoUrl, width: 60, height: 60, style: { borderRadius: '12px' } }
                        } : null,
                        {
                            type: 'div',
                            props: {
                                style: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' },
                                children: [
                                    { type: 'span', props: { style: { fontSize: '32px', fontWeight: 800, color: 'white' }, children: tournament.name } },
                                    { type: 'span', props: { style: { fontSize: '18px', color: '#9ca3af' }, children: 'Tournament Bracket' } }
                                ]
                            }
                        }
                    ]
                }
            },
            // Bracket Container
            {
                type: 'div',
                props: {
                    style: {
                        display: 'flex',
                        padding: '140px 60px 180px 60px', // Top padding for header, Bottom for footer
                        alignItems: 'flex-start'
                    },
                    children: columns
                }
            },
            // Footer with Sponsors and Socials
            {
              type: 'div',
              props: {
                  style: { 
                    position: 'absolute',
                    bottom: '100px',
                    left: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                    width: '100%'
                  },
                  children: [
                    getSponsorsRow(sponsors),
                    ].filter(Boolean)
               }
             },

             ...getAbsoluteFooter(socials)

          ]
        },
      },
      {
        width,
        height,
        fonts: [
          { name: 'Inter', data: fontData, weight: 700, style: 'normal' },
          { name: 'Inter', data: regularFontData, weight: 400, style: 'normal' },
        ],
      }
    )

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
    const pngBuffer = resvg.render().asPng()

    setResponseHeader(event, 'Content-Type', 'image/png')
    const filename = `${tournament.name}-bracket`.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}.png"`)

    return pngBuffer
  } catch (e: any) {
    console.error('Bracket Generation Error:', e)
    throw createError({ statusCode: 500, statusMessage: 'Failed to generate bracket' })
  }
  }, 'bracket')
})

// Helpers
function getTeamName(fixture: Fixture, isHome: boolean) {
    const team = isHome ? fixture.homeTeam : fixture.awayTeam
    if (team?.customName) return team.customName
    const placeholder = isHome ? fixture.homeTeamPlaceholder : fixture.awayTeamPlaceholder
    return placeholder || 'TBD'
}

function getScore(fixture: Fixture, isHome: boolean) {
    if (fixture.status !== 'COMPLETED' && fixture.status !== 'LIVE') return '-'
    
    const score = isHome ? (fixture.homeScore ?? 0) : (fixture.awayScore ?? 0)
    const penaltyScore = isHome ? fixture.homePenaltyScore : fixture.awayPenaltyScore
    
    // Show penalty score if match went to penalties (scores are tied and penalty scores exist)
    const homeScore = fixture.homeScore ?? 0
    const awayScore = fixture.awayScore ?? 0
    const hasPenalties = homeScore === awayScore && 
        (fixture.homePenaltyScore !== null && fixture.homePenaltyScore !== undefined) && 
        (fixture.awayPenaltyScore !== null && fixture.awayPenaltyScore !== undefined)
    
    if (hasPenalties && penaltyScore !== null && penaltyScore !== undefined) {
        return `${score} (${penaltyScore})`
    }
    
    return score.toString()
}

function getWinnerBg(fixture: Fixture, isHome: boolean) {
    if (fixture.status !== 'COMPLETED') return 'transparent'
    
    // Logic for winner
    const home = fixture.homeScore ?? 0
    const away = fixture.awayScore ?? 0
    
    let isWinner = false
    if (home > away) isWinner = isHome
    else if (away > home) isWinner = !isHome
    else {
        // Penalties?
        const hp = fixture.homePenaltyScore ?? 0
        const ap = fixture.awayPenaltyScore ?? 0
        if (hp > ap) isWinner = isHome
        else if (ap > hp) isWinner = !isHome
    }

    return isWinner ? 'rgba(34, 197, 94, 0.2)' : 'transparent' // green-500 @ 20%
}

function getRoundLabel(index: number, total: number) {
    const diff = total - 1 - index
    switch (diff) {
        case 0: return 'Final'
        case 1: return 'Semi-Final'
        case 2: return 'Quarter-Final'
        case 3: return 'Round of 16'
        case 4: return 'Round of 32'
        default: return `Round ${index + 1}`
    }
}
