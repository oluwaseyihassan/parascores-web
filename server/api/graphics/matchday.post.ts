
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { getSponsorsRow, getAbsoluteFooter } from '../../utils/graphics'
import { useGraphicsCache } from '../../utils/cache'

export default defineEventHandler(async (event) => {
  return useGraphicsCache(event, async (body: any) => {
  try {
    const { fixtures, tournament, round, sponsors = [], socials = [] } = body

    if (!fixtures || !tournament || round === undefined) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing fixtures, tournament, or round data'
        })
    }

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

    // Calculate dimensions
    const width = 1200
    const headerHeight = 220
    const fixtureRowHeight = 90
    const footerHeight = 160
    const height = headerHeight + (fixtures.length * fixtureRowHeight) + footerHeight

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

    // Round display name
    const roundDisplayName = fixtures[0]?.roundName || `Matchday ${round}`

    // Calculate date range
    const matchDates = fixtures
        .filter((f: any) => f.startTime)
        .map((f: any) => new Date(f.startTime))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime())

    let dateDisplay = ''
    if (matchDates.length > 0) {
        const firstDate = matchDates[0]
        const lastDate = matchDates[matchDates.length - 1]
        const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        const sameDay = firstDate.toDateString() === lastDate.toDateString()
        dateDisplay = sameDay ? fmt(firstDate) : `${fmt(firstDate)} - ${fmt(lastDate)}`
    }

    // Generate fixture rows
    const fixtureRows = fixtures.map((fixture: any, index: number) => {
        const homeTeam = fixture.homeTeam
        const awayTeam = fixture.awayTeam
        const isCompleted = fixture.status === 'COMPLETED'
        const isLive = fixture.status === 'LIVE'
        const hasScore = isCompleted || isLive
        const matchTime = fixture.startTime 
            ? new Date(fixture.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : 'TBD'

        // Score or time center element
        const centerContent = hasScore ? {
            type: 'div',
            props: {
                style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
                children: [
                    {
                        type: 'div',
                        props: {
                            style: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
                            children: [
                                {
                                    type: 'span',
                                    props: {
                                        children: String(fixture.homeScore ?? 0),
                                        style: { fontSize: '28px', fontWeight: 'bold', color: 'white', fontFamily: 'Roboto Mono' }
                                    }
                                },
                                {
                                    type: 'span',
                                    props: {
                                        children: '-',
                                        style: { fontSize: '22px', color: '#6b7280', padding: '0 10px', fontFamily: 'Roboto Mono' }
                                    }
                                },
                                {
                                    type: 'span',
                                    props: {
                                        children: String(fixture.awayScore ?? 0),
                                        style: { fontSize: '28px', fontWeight: 'bold', color: 'white', fontFamily: 'Roboto Mono' }
                                    }
                                }
                            ]
                        }
                    },
                    // Status badge
                    isLive ? {
                        type: 'div',
                        props: {
                            style: { 
                                display: 'flex',
                                backgroundColor: 'rgba(239, 68, 68, 0.15)', 
                                borderRadius: '9999px',
                                padding: '2px 10px',
                            },
                            children: [{
                                type: 'span',
                                props: {
                                    children: 'LIVE',
                                    style: { fontSize: '11px', fontWeight: 'bold', color: '#ef4444', letterSpacing: '1px' }
                                }
                            }]
                        }
                    } : {
                        type: 'div',
                        props: {
                            style: { 
                                display: 'flex',
                                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                                borderRadius: '9999px',
                                padding: '2px 10px',
                            },
                            children: [{
                                type: 'span',
                                props: {
                                    children: 'FT',
                                    style: { fontSize: '11px', fontWeight: 'bold', color: '#22c55e', letterSpacing: '1px' }
                                }
                            }]
                        }
                    }
                ].filter(Boolean)
            }
        } : {
            type: 'span',
            props: {
                children: matchTime,
                style: { fontSize: '18px', fontWeight: 600, color: '#9ca3af', fontFamily: 'Roboto Mono' }
            }
        }

        return {
            type: 'div',
            props: {
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '18px 48px',
                    borderBottom: index < fixtures.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    gap: '24px'
                },
                children: [
                    // Home Team
                    {
                        type: 'div',
                        props: {
                            style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px', width: '380px' },
                            children: [
                                {
                                    type: 'span',
                                    props: {
                                        children: homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD',
                                        style: { fontSize: '22px', fontWeight: 600, color: 'white', textAlign: 'right', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                                    }
                                },
                                homeTeam?.logoUrl ? {
                                    type: 'img',
                                    props: { src: homeTeam.logoUrl, width: 44, height: 44, style: { objectFit: 'contain' } }
                                } : {
                                    type: 'div',
                                    props: {
                                        style: { width: 44, height: 44, borderRadius: '22px', backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: 'white' },
                                        children: (homeTeam?.customName || fixture.homeTeamPlaceholder || 'H').charAt(0).toUpperCase()
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
                                alignItems: 'center', 
                                justifyContent: 'center',
                                width: '160px',
                            },
                            children: [centerContent]
                        }
                    },
                    // Away Team
                    {
                        type: 'div',
                        props: {
                            style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '16px', width: '380px' },
                            children: [
                                awayTeam?.logoUrl ? {
                                    type: 'img',
                                    props: { src: awayTeam.logoUrl, width: 44, height: 44, style: { objectFit: 'contain' } }
                                } : {
                                    type: 'div',
                                    props: {
                                        style: { width: 44, height: 44, borderRadius: '22px', backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: 'white' },
                                        children: (awayTeam?.customName || fixture.awayTeamPlaceholder || 'A').charAt(0).toUpperCase()
                                    }
                                },
                                {
                                    type: 'span',
                                    props: {
                                        children: awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD',
                                        style: { fontSize: '22px', fontWeight: 600, color: 'white', textAlign: 'left', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
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
                  padding: '40px 48px',
                },
                children: [
                    // Header
                    {
                      type: 'div',
                      props: {
                          style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '32px' },
                          children: [
                              // Tournament logo + name row
                              {
                                  type: 'div',
                                  props: {
                                      style: { display: 'flex', alignItems: 'center', gap: '16px' },
                                      children: [
                                          tournament.logoUrl ? {
                                              type: 'img',
                                              props: { src: tournament.logoUrl, width: 56, height: 56, style: { objectFit: 'contain', borderRadius: '8px' } }
                                          } : null,
                                          {
                                              type: 'span',
                                              props: {
                                                  children: tournament.name || 'Tournament',
                                                  style: { fontSize: '32px', fontWeight: 'bold', textAlign: 'center' }
                                              }
                                          }
                                      ].filter(Boolean)
                                  }
                              },
                              // Round name + date on same line
                              {
                                  type: 'div',
                                  props: {
                                      style: { display: 'flex', alignItems: 'center', gap: '12px' },
                                      children: [
                                          {
                                              type: 'span',
                                              props: {
                                                  children: roundDisplayName,
                                                  style: { fontSize: '22px', color: '#9ca3af', fontWeight: 500 }
                                              }
                                          },
                                          dateDisplay ? {
                                              type: 'span',
                                              props: {
                                                  children: '·',
                                                  style: { fontSize: '22px', color: '#4b5563' }
                                              }
                                          } : null,
                                          dateDisplay ? {
                                              type: 'span',
                                              props: {
                                                  children: dateDisplay,
                                                  style: { fontSize: '18px', color: '#6b7280', fontWeight: 400 }
                                              }
                                          } : null
                                      ].filter(Boolean)
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
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                borderRadius: '20px',
                                border: '1px solid rgba(255,255,255,0.06)',
                                overflow: 'hidden'
                            },
                            children: fixtureRows
                        }
                    },
                    // Footer with Sponsors
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
    return pngBuffer

  } catch (err: any) {
    console.error('Matchday graphic generation error:', err)
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Failed to generate matchday graphic'
    })
  }
  }, 'matchday')
})
