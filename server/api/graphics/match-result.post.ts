
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { match, homeTeam, awayTeam, tournament } = body

    if (!match || !homeTeam || !awayTeam) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing match or team data'
        })
    }

    // Fetch font (Inter) with fallback
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
        console.warn('Failed to load remote fonts, using fallback system font if available or erroring out safely.')
        // In a real scenario, you'd fallback to a local file or default font.
        // For now, let's re-throw or handle gracefully if satori needs it.
        // Satori needs a font. Let's try a different source if valid, or just throw with better message.
        console.error('Font loading failed:', e)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to load required assets (fonts)'
        })
    }


  const homeScore = match.homeScore ?? 0
  const awayScore = match.awayScore ?? 0
  
  const height = 630
  const width = 1200

  // Background Strategy
  const backgroundLayers = []
  
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
                justifyContent: 'center',
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
                        marginBottom: '40px',
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
                                            width: 40,
                                            height: 40,
                                            style: { borderRadius: '8px' }
                                        }
                                    } : null,
                                    {
                                        type: 'span',
                                        props: {
                                            children: tournament.name,
                                            style: { fontSize: '24px', color: '#e5e7eb', fontWeight: 600 } // gray-200
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
                            justifyContent: 'space-between',
                            width: '80%',
                            padding: '40px',
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
                                        homeTeam.logoUrl ? {
                                            type: 'img',
                                            props: { src: homeTeam.logoUrl, width: 120, height: 120, style: { objectFit: 'contain' } }
                                        } : {
                                            type: 'div',
                                            props: {
                                                style: { width: 120, height: 120, borderRadius: '60px', backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: 'bold' },
                                                children: (homeTeam.customName || 'H').charAt(0).toUpperCase()
                                            }
                                        },
                                        {
                                            type: 'span',
                                            props: {
                                                children: homeTeam.customName || 'Home Team',
                                                style: { fontSize: '32px', fontWeight: 'bold', textAlign: 'center' }
                                            }
                                        }
                                    ]
                                }
                            },
                            // Score
                            {
                                type: 'div',
                                props: {
                                    style: { display: 'flex', alignItems: 'center', gap: '40px' },
                                    children: [
                                        {
                                            type: 'span',
                                            props: {
                                                children: homeScore,
                                                style: { fontSize: '96px', fontWeight: 'bold' }
                                            }
                                        },
                                        {
                                            type: 'span',
                                            props: {
                                                children: '-',
                                                style: { fontSize: '64px', color: '#6b7280' }
                                            }
                                        },
                                        {
                                            type: 'span',
                                            props: {
                                                children: awayScore,
                                                style: { fontSize: '96px', fontWeight: 'bold' }
                                            }
                                        }
                                    ]
                                }
                            },
                            // Away Team
                            {
                                 type: 'div',
                                 props: {
                                    style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '300px' },
                                    children: [
                                        awayTeam.logoUrl ? {
                                            type: 'img',
                                            props: { src: awayTeam.logoUrl, width: 120, height: 120, style: { objectFit: 'contain' } }
                                        } : {
                                            type: 'div',
                                            props: {
                                                style: { width: 120, height: 120, borderRadius: '60px', backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: 'bold' },
                                                children: (awayTeam.customName || 'A').charAt(0).toUpperCase()
                                            }
                                        },
                                        {
                                            type: 'span',
                                            props: {
                                                children: awayTeam.customName || 'Away Team',
                                                style: { fontSize: '32px', fontWeight: 'bold', textAlign: 'center' }
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                  },
                  // Footer
                  {
                    type: 'div',
                    props: {
                        style: { marginTop: '40px', color: '#6b7280', fontSize: '18px' },
                        children: 'Generated by ParaScores'
                    }
                  }
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
  const filename = `${homeTeam.customName || 'Home'}-vs-${awayTeam.customName || 'Away'}-${match.id || 'result'}`.replace(/[^a-z0-9]/gi, '_').toLowerCase()
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
})
