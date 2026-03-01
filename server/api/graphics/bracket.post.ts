
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
    const matchHeight = 140 // Height of a single match card
    const matchGap = 40    // Gap between matches in round 1
    const cardWidth = 400
    const colWidth = cardWidth + 100 // column width including gap to next column
    
    // Calculate total height based on Round 1 matches
    // Calculate total height based on Round 1 matches (increased buffer for footer)
    const round1Matches = fixturesByRound[rounds[0]]?.length || 0
    const contentHeight = Math.max(1080, (round1Matches * (matchHeight + matchGap)) + 600) // +600 for header/padding/footer
    const contentWidth = Math.max(1600, (rounds.length * colWidth) + 100)

    const height = contentHeight
    const width = contentWidth

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
                  top: 0, left: 0,
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
            
            const unit = matchHeight + matchGap
            const power = Math.pow(2, rIndex)
            const marginTop = mIndex === 0 ? (unit * (power - 1)) / 2 : 0
            const marginBottom = (unit * power) - matchHeight

            // Connector
            let connector = null
            if (rIndex < rounds.length - 1) {
                // To connect two cards perfectly:
                // unit = matchHeight + matchGap
                // The vertical gap between the top card's bottom and the bottom card's top in a pair is: 
                // `unit * Math.pow(2, rIndex) - matchHeight`
                // BUT, we want the line to start from the vertical center of the card.
                // The absolute distance between vertical centers of paired matches is `unit * Math.pow(2, rIndex)`.
                // Ergo, each half-connector must cover exactly HALF that distance vertically.
                const offset = (unit * Math.pow(2, rIndex)) / 2
                const isTop = mIndex % 2 === 0
                
                connector = {
                    type: 'div',
                    props: {
                        style: {
                            position: 'absolute',
                            right: '-50px',
                            width: '50px',
                            height: `${offset + 1.5}px`,
                            [isTop ? 'top' : 'bottom']: `${matchHeight / 2 - 1.5}px`,
                            display: 'flex'
                        },
                        children: [
                            {
                                type: 'svg',
                                props: {
                                    width: 50,
                                    height: offset + 1.5,
                                    viewBox: `0 0 50 ${offset + 1.5}`,
                                    children: [
                                        {
                                            type: 'path',
                                            props: {
                                                d: isTop 
                                                    ? `M0,1.5 H25 V${offset + 1.5} H50`
                                                    : `M0,${offset} H25 V0 H50`,
                                                stroke: '#6b7280',
                                                strokeWidth: 3,
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
                        width: `${cardWidth}px`,
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
                                    border: '2px solid #374151',
                                    borderRadius: '12px',
                                    overflow: 'hidden'
                                },
                                children: [
                                    // Home Team
                                    {
                                        type: 'div',
                                        props: {
                                            style: { flex: 1, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '2px solid #374151', backgroundColor: getWinnerBg(fixture, true) },
                                            children: [
                                                { type: 'span', props: { style: { flex: 1, fontSize: '24px', fontWeight: 600, color: 'white', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }, children: getTeamName(fixture, true) } },
                                                { type: 'span', props: { style: { fontSize: '28px', fontWeight: 700, color: 'white' }, children: getScore(fixture, true) } }
                                            ]
                                        }
                                    },
                                    // Away Team
                                    {
                                        type: 'div',
                                        props: {
                                            style: { flex: 1, display: 'flex', alignItems: 'center', padding: '0 20px', backgroundColor: getWinnerBg(fixture, false) },
                                            children: [
                                                { type: 'span', props: { style: { flex: 1, fontSize: '24px', fontWeight: 600, color: 'white', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }, children: getTeamName(fixture, false) } },
                                                { type: 'span', props: { style: { fontSize: '28px', fontWeight: 700, color: 'white' }, children: getScore(fixture, false) } }
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
                    marginRight: rIndex < rounds.length - 1 ? '100px' : '0' // Gap between columns
                },
                children: [
                            // Round Header
                            {
                                type: 'div',
                                props: {
                                    style: { display: 'flex', justifyContent: 'center', width: '100%', textAlign: 'center', color: '#9ca3af', fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '30px', letterSpacing: '0.05em' },
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
