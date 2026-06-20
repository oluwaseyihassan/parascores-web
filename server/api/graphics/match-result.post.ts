
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { getSponsorsRow, getAbsoluteFooter } from '../../utils/graphics'
import { useGraphicsCache } from '../../utils/cache'

export default defineEventHandler(async (event) => {
  return useGraphicsCache(event, async (body: any) => {
  try {
    const { match, homeTeam, awayTeam, tournament, events = [], sponsors = [], socials = [], transparent = false } = body

    if (!match || !tournament) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing match or tournament data'
        })
    }

    const homeName = homeTeam?.customShortName || homeTeam?.customName || match.homeTeamPlaceholder || 'Home Team'
    const awayName = awayTeam?.customShortName || awayTeam?.customName || match.awayTeamPlaceholder || 'Away Team'
    const homeLogo = homeTeam?.logoUrl
    const awayLogo = awayTeam?.logoUrl

    // Fetch fonts (Inter + Roboto Mono for scores)
    let fontData: ArrayBuffer
    let regularFontData: ArrayBuffer
    let monoFontData: ArrayBuffer

    try {
        const fetchFont = async (url: string) => {
            const res = await fetch(url)
            if (!res.ok) throw new Error(`Failed to fetch font: ${url}`)
            return res.arrayBuffer()
        }

        const fetchFonts = async (cdnFn: (weight: number) => string, monoCdnFn: (weight: number) => string) => {
            const [bold, reg, mono] = await Promise.all([
                fetchFont(cdnFn(700)),
                fetchFont(cdnFn(400)),
                fetchFont(monoCdnFn(700))
            ])
            return [bold, reg, mono]
        }

        try {
            const result = await fetchFonts(
                w => `https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-${w}-normal.woff`,
                w => `https://cdn.jsdelivr.net/npm/@fontsource/roboto-mono@5.0.8/files/roboto-mono-latin-${w}-normal.woff`
            )
            fontData = result[0]
            regularFontData = result[1]
            monoFontData = result[2]
        } catch (err) {
            console.warn('Primary font CDN failed, trying fallback...', err)
            const result = await fetchFonts(
                w => `https://unpkg.com/@fontsource/inter@5.0.8/files/inter-latin-${w}-normal.woff`,
                w => `https://unpkg.com/@fontsource/roboto-mono@5.0.8/files/roboto-mono-latin-${w}-normal.woff`
            )
            fontData = result[0]
            regularFontData = result[1]
            monoFontData = result[2]
        }
    } catch (e) {
        console.error('Font loading failed:', e)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to load required assets (fonts)'
        })
    }


  const homeScore = match.homeScore ?? 0
  const awayScore = match.awayScore ?? 0
  
  // Calculate dynamic height based on number of goals
  // Calculate dynamic height based on number of goals
  const goalEvents = events.filter((e: any) => e.type === 'GOAL' || e.type === 'PENALTY' || e.type === 'OWN_GOAL')
  const homeGoalCount = goalEvents.filter((e: any) => (homeTeam && (e.participantId === homeTeam.id || e.participant_id === homeTeam.id))).length
  const awayGoalCount = goalEvents.filter((e: any) => (awayTeam && (e.participantId === awayTeam.id || e.participant_id === awayTeam.id))).length
  const maxGoals = Math.max(homeGoalCount, awayGoalCount, 0)
  // Ensure enough base height to fit the scorecard AND full footer (sponsors + socials)
  const baseHeight = 800
  const goalRowHeight = 24
  const height = baseHeight + (maxGoals * goalRowHeight)
  const width = 1200

  // Background Strategy
  const backgroundLayers = []
  
  if (!transparent) {
      if (tournament.bannerUrl) {
          // Blurred Banner Layer
          backgroundLayers.push({
              type: 'img',
              props: {
                  src: tournament.bannerUrl,
                  width: width,
                  height: height,
                  style: {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'blur(15px)',
                      transform: 'scale(1.1)', // Scale up to hide blurred edges
                  }
              }
          })
          // Dark Overlay Layer for contrast
          backgroundLayers.push({
              type: 'div',
              props: {
                  style: {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'rgba(17, 24, 39, 0.8)' // dark-900 with high opacity
                  }
              }
          })
      } else {
           // Fallback Gradient Layer
           backgroundLayers.push({
              type: 'div',
              props: {
                  style: {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#111827',
                      backgroundImage: 'radial-gradient(circle at 25% 0%, #312e81 0%, #111827 50%)',
                  }
              }
          })
      }
  }

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          height: '100%',
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: transparent ? 'transparent' : '#111827',
          fontFamily: 'Inter',
        },
        children: [
          ...backgroundLayers,
          // Content Container
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingTop: '60px', // Restore top padding for balance
                width: '100%',
                height: '100%',
                position: 'relative', // Stack on top of background
                color: 'white',
              },
              children: [
                  // Tournament Header
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        marginBottom: '40px', // Restore padding
                        gap: '8px', 
                      },
                      children: [
                        {
                            type: 'div',
                            props: {
                                style: { display: 'flex', alignItems: 'center', gap: '16px' },
                                children: [
                                    tournament.logoUrl ? {
                                        type: 'img',
                                        props: {
                                            src: tournament.logoUrl,
                                            width: 56,
                                            height: 56,
                                            style: { borderRadius: '8px' }
                                        }
                                    } : null,
                                    {
                                        type: 'span',
                                        props: {
                                            children: tournament.name,
                                            style: { fontSize: '32px', color: '#e5e7eb', fontWeight: 600 } // gray-200
                                        }
                                    }
                                ]
                            }
                        },
                        match.startTime ? {
                            type: 'span',
                            props: {
                                children: new Date(match.startTime).toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }),
                                style: { fontSize: '18px', color: '#9ca3af' } // gray-400
                            }
                        } : null
                      ]
                    }
                  },
                  // Score Board
                  {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '80%',
                            padding: '30px', // Slightly tighten inner card padding
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderRadius: '24px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        },
                        children: [
                            // Home Team
                            {
                                type: 'div',
                                props: {
                                    style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '300px' },
                                    children: [
                                        homeLogo ? {
                                            type: 'img',
                                            props: { src: homeLogo, width: 120, height: 120, style: { objectFit: 'contain' } }
                                        } : {
                                            type: 'div',
                                            props: {
                                                style: { width: 120, height: 120, borderRadius: '60px', backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: 'bold' },
                                                children: homeName.charAt(0).toUpperCase()
                                            }
                                        },
                                        {
                                            type: 'span',
                                            props: {
                                                children: homeName,
                                                style: { fontSize: '32px', fontWeight: 'bold', textAlign: 'center' }
                                            }
                                        }
                                    ]
                                }
                            },
                            // Score or VS
                            {
                                type: 'div',
                                props: {
                                    style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
                                    children: [
                                        (match.status === 'COMPLETED' || match.status === 'LIVE') ? {
                                            type: 'div',
                                            props: {
                                                style: { display: 'flex', alignItems: 'center', gap: '40px' },
                                                children: [
                                                    {
                                                        type: 'span',
                                                        props: {
                                                            children: homeScore,
                                                            style: { fontSize: '96px', fontWeight: 'bold', fontFamily: 'Roboto Mono' }
                                                        }
                                                    },
                                                    {
                                                        type: 'span',
                                                        props: {
                                                            children: '-',
                                                            style: { fontSize: '64px', color: '#6b7280', fontFamily: 'Roboto Mono' }
                                                        }
                                                    },
                                                    {
                                                        type: 'span',
                                                        props: {
                                                            children: awayScore,
                                                            style: { fontSize: '96px', fontWeight: 'bold', fontFamily: 'Roboto Mono' }
                                                        }
                                                    }
                                                ]
                                            }
                                        } : {
                                            type: 'span',
                                            props: {
                                                children: 'VS',
                                                style: { fontSize: '84px', fontWeight: 'bold', color: '#6b7280', letterSpacing: '4px' }
                                            }
                                        },
                                        // Full Time indicator for completed matches
                                        match.status === 'COMPLETED' ? {
                                            type: 'div',
                                            props: {
                                                style: { 
                                                    display: 'flex',
                                                    backgroundColor: 'rgba(34, 197, 94, 0.2)', 
                                                    border: '1px solid rgba(34, 197, 94, 0.5)',
                                                    borderRadius: '9999px',
                                                    padding: '8px 24px',
                                                },
                                                children: {
                                                    type: 'span',
                                                    props: {
                                                        children: 'FULL TIME',
                                                        style: { 
                                                            fontSize: '18px', 
                                                            fontWeight: 'bold', 
                                                            color: '#22c55e',
                                                            letterSpacing: '2px'
                                                        }
                                                    }
                                                }
                                            }
                                        } : null
                                    ].filter(Boolean)
                                }
                            },
                            // Away Team
                            {
                                 type: 'div',
                                 props: {
                                    style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '300px' },
                                    children: [
                                        awayLogo ? {
                                            type: 'img',
                                            props: { src: awayLogo, width: 120, height: 120, style: { objectFit: 'contain' } }
                                        } : {
                                            type: 'div',
                                            props: {
                                                style: { width: 120, height: 120, borderRadius: '60px', backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: 'bold' },
                                                children: awayName.charAt(0).toUpperCase()
                                            }
                                        },
                                        {
                                            type: 'span',
                                            props: {
                                                children: awayName,
                                                style: { fontSize: '32px', fontWeight: 'bold', textAlign: 'center' }
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                  },
                  // Goal Details Section
                  (events && events.length > 0) ? {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        width: '80%',
                        marginTop: '24px',
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        gap: '80px',
                      },
                      children: [
                        // Home Team Goals (right-aligned)
                        {
                          type: 'div',
                          props: {
                            style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flex: 1, maxWidth: '350px', gap: '6px' },
                            children: events
                              .filter((e: any) => (e.type === 'GOAL' || e.type === 'PENALTY' || e.type === 'OWN_GOAL') && homeTeam && (e.participantId === homeTeam.id || e.participant_id === homeTeam.id))
                              .sort((a: any, b: any) => (a.minute || 0) - (b.minute || 0))
                              .map((goal: any) => ({
                                type: 'span',
                                props: {
                                  children: `${goal.player?.name || 'Unknown'} ${goal.minute ? `${goal.minute}'` : ''}${goal.type === 'PENALTY' ? ' (P)' : ''}${goal.type === 'OWN_GOAL' ? ' (OG)' : ''}${goal.relatedPlayer ? ` (${goal.relatedPlayer.name})` : ''}`,
                                  style: { fontSize: '14px', color: '#d1d5db', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '20px' }
                                }
                              }))
                          }
                        },
                        // Away Team Goals (left-aligned)
                        {
                          type: 'div',
                          props: {
                            style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, maxWidth: '350px', gap: '6px' },
                            children: events
                              .filter((e: any) => (e.type === 'GOAL' || e.type === 'PENALTY' || e.type === 'OWN_GOAL') && awayTeam && (e.participantId === awayTeam.id || e.participant_id === awayTeam.id))
                              .sort((a: any, b: any) => (a.minute || 0) - (b.minute || 0))
                              .map((goal: any) => ({
                                type: 'span',
                                props: {
                                  children: `${goal.player?.name || 'Unknown'} ${goal.minute ? `${goal.minute}'` : ''}${goal.type === 'PENALTY' ? ' (P)' : ''}${goal.type === 'OWN_GOAL' ? ' (OG)' : ''}${goal.relatedPlayer ? ` (${goal.relatedPlayer.name})` : ''}`,
                                  style: { fontSize: '14px', color: '#d1d5db', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '20px' }
                                }
                              }))
                          }
                        }
                      ]
                    }
                  } : null,
                  // Footer with Sponsors and Socials
                  {
                    type: 'div',
                    props: {
                        style: { 
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          marginTop: 'auto',
                          paddingTop: '50px', 
                          paddingBottom: '80px', 
                          gap: '16px',
                          width: '100%'
                        },
                        children: [
                          getSponsorsRow(sponsors),
                        ].filter(Boolean)
                    }
                  },
                  ...getAbsoluteFooter(socials)
              ].filter(Boolean)
            }
          }
        ]
      }
    },
    {
      width,
      height,
      fonts: [
        {
          name: 'Inter',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
        {
          name: 'Inter',
          data: regularFontData,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Roboto Mono',
          data: monoFontData,
          weight: 700,
          style: 'normal',
        },
      ],
    }
  )

  const resvg = new Resvg(svg, {
    fitTo: {
        mode: 'width',
        value: width,
    },
  })
  
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()

  setResponseHeader(event, 'Content-Type', 'image/png')
  const filename = `${homeName}-vs-${awayName}-${match.id || 'result'}`.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}.png"`)

    return pngBuffer
  } catch (e: any) {
      console.error('Graphics Generation Error:', e)
      throw createError({
          statusCode: e.statusCode || 500,
          statusMessage: e.statusMessage || 'Failed to generate graphic',
          data: e.message
      })
  }
  }, 'match-result')
})
