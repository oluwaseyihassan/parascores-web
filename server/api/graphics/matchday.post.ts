
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { getSponsorsRow, getAbsoluteFooter } from '../../utils/graphics'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { fixtures, tournament, round, sponsors = [], socials = [] } = body

    if (!fixtures || !tournament || round === undefined) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing fixtures, tournament, or round data'
        })
    }

    // Fetch fonts
    let fontData: ArrayBuffer
    let regularFontData: ArrayBuffer

    try {
        const fetchFonts = async (cdnFn: (weight: number) => string) => {
             const [boldRes, regRes] = await Promise.all([
                fetch(cdnFn(700)),
                fetch(cdnFn(400))
            ])
            if (!boldRes.ok || !regRes.ok) throw new Error('Failed to fetch fonts')
            return Promise.all([boldRes.arrayBuffer(), regRes.arrayBuffer()])
        }

        try {
            // Try jsdelivr first
            const result = await fetchFonts(w => `https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-${w}-normal.woff`)
            fontData = result[0]
            regularFontData = result[1]
        } catch (err) {
            console.warn('Primary font CDN failed, trying fallback...', err)
            // Fallback to unpkg
            const result = await fetchFonts(w => `https://unpkg.com/@fontsource/inter@5.0.8/files/inter-latin-${w}-normal.woff`)
            fontData = result[0]
            regularFontData = result[1]
        }
    } catch (e) {
        console.error('Font loading failed:', e)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to load required assets (fonts)'
        })
    }

    // Calculate dimensions - accommodates any number of matches
    const width = 1200
    const baseHeight = 500 // Increased for footer
    const fixtureRowHeight = 100
    const height = baseHeight + (fixtures.length * fixtureRowHeight)

    // Background layers
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
                    top: 0,
                    left: 0,
                    objectFit: 'cover',
                    filter: 'blur(20px) brightness(0.4)',
                }
            }
        })
        backgroundLayers.push({
            type: 'div',
            props: {
                style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(17, 24, 39, 0.85)'
                }
            }
        })
    } else {
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

    // Get round display name from fixtures (e.g. "Semi-Final") or fallback to "Round X"
    const roundDisplayName = fixtures[0]?.roundName || `Round ${round}`

    // Generate fixture rows
    const fixtureRows = fixtures.map((fixture: any, index: number) => {
        const homeTeam = fixture.homeTeam
        const awayTeam = fixture.awayTeam
        const isCompleted = fixture.status === 'COMPLETED'
        const isLive = fixture.status === 'LIVE'
        const matchTime = fixture.startTime 
            ? new Date(fixture.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : 'TBD'

        return {
            type: 'div',
            props: {
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px 40px',
                    borderBottom: index < fixtures.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    gap: '32px'
                },
                children: [
                    // Home Team
                    {
                        type: 'div',
                        props: {
                            style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px', width: '350px' },
                            children: [
                                {
                                    type: 'span',
                                    props: {
                                        children: homeTeam?.customName || 'TBD',
                                        style: { fontSize: '24px', fontWeight: 600, color: 'white', textAlign: 'right', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                                    }
                                },
                                homeTeam?.logoUrl ? {
                                    type: 'img',
                                    props: { src: homeTeam.logoUrl, width: 50, height: 50, style: { objectFit: 'contain' } }
                                } : {
                                    type: 'div',
                                    props: {
                                        style: { width: 50, height: 50, borderRadius: '25px', backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', color: 'white' },
                                        children: (homeTeam?.customName || 'H').charAt(0).toUpperCase()
                                    }
                                }
                            ]
                        }
                    },
                    // Score/Time
                    {
                        type: 'div',
                        props: {
                            style: { 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                width: '140px',
                                gap: '4px'
                            },
                            children: [
                                isCompleted || isLive ? {
                                    type: 'div',
                                    props: {
                                        style: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
                                        children: [
                                            {
                                                type: 'div',
                                                props: {
                                                    children: String(fixture.homeScore ?? 0),
                                                    style: { fontSize: '32px', fontWeight: 'bold', color: 'white', width: '50px', display: 'flex', justifyContent: 'flex-end' }
                                                }
                                            },
                                            {
                                                type: 'span',
                                                props: {
                                                    children: '-',
                                                    style: { fontSize: '24px', color: '#6b7280', padding: '0 8px' }
                                                }
                                            },
                                            {
                                                type: 'div',
                                                props: {
                                                    children: String(fixture.awayScore ?? 0),
                                                    style: { fontSize: '32px', fontWeight: 'bold', color: 'white', width: '50px', display: 'flex', justifyContent: 'flex-start' }
                                                }
                                            }
                                        ]
                                    }
                                } : {
                                    type: 'span',
                                    props: {
                                        children: matchTime,
                                        style: { fontSize: '20px', fontWeight: 600, color: '#9ca3af' }
                                    }
                                },
                                isLive ? {
                                    type: 'div',
                                    props: {
                                        style: { 
                                            display: 'flex',
                                            backgroundColor: 'rgba(239, 68, 68, 0.2)', 
                                            border: '1px solid rgba(239, 68, 68, 0.5)',
                                            borderRadius: '9999px',
                                            padding: '4px 12px',
                                        },
                                        children: [{
                                            type: 'span',
                                            props: {
                                                children: 'LIVE',
                                                style: { fontSize: '12px', fontWeight: 'bold', color: '#ef4444', textTransform: 'uppercase' }
                                            }
                                        }]
                                    }
                                } : isCompleted ? {
                                    type: 'div',
                                    props: {
                                        style: { 
                                            display: 'flex',
                                            backgroundColor: 'rgba(34, 197, 94, 0.2)', 
                                            border: '1px solid rgba(34, 197, 94, 0.5)',
                                            borderRadius: '9999px',
                                            padding: '4px 12px',
                                        },
                                        children: [{
                                            type: 'span',
                                            props: {
                                                children: 'FT',
                                                style: { fontSize: '12px', fontWeight: 'bold', color: '#22c55e', textTransform: 'uppercase' }
                                            }
                                        }]
                                    }
                                } : null
                            ].filter(Boolean)
                        }
                    },
                    // Away Team
                    {
                        type: 'div',
                        props: {
                            style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '16px', width: '350px' },
                            children: [
                                awayTeam?.logoUrl ? {
                                    type: 'img',
                                    props: { src: awayTeam.logoUrl, width: 50, height: 50, style: { objectFit: 'contain' } }
                                } : {
                                    type: 'div',
                                    props: {
                                        style: { width: 50, height: 50, borderRadius: '25px', backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', color: 'white' },
                                        children: (awayTeam?.customName || 'A').charAt(0).toUpperCase()
                                    }
                                },
                                {
                                    type: 'span',
                                    props: {
                                        children: awayTeam?.customName || 'TBD',
                                        style: { fontSize: '24px', fontWeight: 600, color: 'white', textAlign: 'left', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                                    }
                                }
                            ]
                        }
                    }
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
            height: '100%',
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#111827',
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
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  color: 'white',
                  padding: '40px',
                },
                children: [
                    // Header
                    {
                      type: 'div',
                      props: {
                          style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '24px' },
                          children: [
                              tournament.logoUrl ? {
                                  type: 'img',
                                  props: { src: tournament.logoUrl, width: 60, height: 60, style: { objectFit: 'contain' } }
                              } : null,
                              {
                                  type: 'span',
                                  props: {
                                      children: tournament.name || 'Tournament',
                                      style: { fontSize: '28px', fontWeight: 'bold', textAlign: 'center' }
                                  }
                              },
                              {
                                  type: 'span',
                                  props: {
                                      children: roundDisplayName,
                                      style: { fontSize: '20px', color: '#9ca3af' }
                                  }
                              }
                          ].filter(Boolean)
                      }
                    },
                    // Fixtures List
                    {
                        type: 'div',
                        props: {
                            style: { 
                                display: 'flex', 
                                flexDirection: 'column', 
                                width: '100%',
                                backgroundColor: 'rgba(0,0,0,0.3)',
                                borderRadius: '16px',
                                overflow: 'hidden'
                            },
                            children: fixtureRows
                        }
                    },
                    // Footer with Sponsors and Socials
                    {
                      type: 'div',
                      props: {
                          style: { 
                            marginTop: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '16px',
                            width: '100%',
                            paddingTop: '50px',
                            paddingBottom: '80px'
                          },
                          children: [
                            getSponsorsRow(sponsors),
                          ].filter(Boolean)
                      }
                    },
                    ...getAbsoluteFooter(socials)
                ]
              }
            }
          ]
        },
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
    return pngBuffer

  } catch (err: any) {
    console.error('Matchday graphic generation error:', err)
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Failed to generate matchday graphic'
    })
  }
})
