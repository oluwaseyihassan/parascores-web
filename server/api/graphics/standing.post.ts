
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { getSponsorsRow, getAbsoluteFooter } from '../../utils/graphics'
import { useGraphicsCache } from '../../utils/cache'

export default defineEventHandler(async (event) => {
  return useGraphicsCache(event, async (body: any) => {
  try {
    const { standings, tournament, title, sponsors = [], socials = [], transparent = false } = body

    if (!standings || !tournament) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing standings or tournament data'
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
        console.warn('Failed to load remote fonts, using fallback.')
        console.error(e)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to load required assets (fonts)'
        })
    }

  // Detect multiple groups
  const distinctGroups = Array.from(
    new Set(standings.map((s: any) => s.group || s.participant?.group?.name).filter(Boolean))
  )
  const hasMultipleGroups = distinctGroups.length > 1

  // Dynamic content-based height calculation with balanced breathing room
  const topPadding = 48
  const headerHeight = 138
  const tableHeaderHeight = 58
  const rowHeight = 69
  const groupHeadersHeight = hasMultipleGroups ? (47 + (distinctGroups.length - 1) * 63) : 0
  const sponsorsHeight = (sponsors && sponsors.length > 0) ? 76 : 0
  const socialsHeight = (socials && socials.length > 0) ? (Math.min(socials.length, 4) * 50) : 0
  // 96px buffer gives ~48px breathing room between the table and Powered by ParaScores
  const footerBuffer = Math.max(96, socialsHeight + 36)

  const height = topPadding
    + headerHeight
    + tableHeaderHeight
    + (standings.length * rowHeight)
    + groupHeadersHeight
    + sponsorsHeight
    + footerBuffer
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
                      backgroundColor: 'rgba(17, 24, 39, 0.85)' // Slightly darker for table readability
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

  // Helper to render a single table row
  const renderTableRow = (row: any, index: number) => {
      const isTop4 = (row.position || index + 1) <= 4
      const teamName = row.participant?.customShortName || row.participant?.customName || row.participantName || 'Team'
      return {
          type: 'div',
          props: {
              style: {
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 24px',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'
              },
              children: [
                  // Pos
                  {
                      type: 'div',
                      props: {
                          style: { 
                              width: '60px', 
                              display: 'flex', 
                              justifyContent: 'center',
                              alignItems: 'center'
                          },
                          children: {
                              type: 'div',
                              props: {
                                  style: {
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '16px',
                                      backgroundColor: isTop4 ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                      color: isTop4 ? '#a5b4fc' : '#9ca3af',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 'bold',
                                      fontSize: '18px'
                                  },
                                  children: row.position || index + 1
                              }
                          }
                      }
                  },
                  // Team
                  {
                      type: 'div',
                      props: {
                          style: { flex: 1, display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '16px' },
                          children: [
                               row.participant?.logoUrl ? {
                                  type: 'img',
                                  props: {
                                      src: row.participant.logoUrl,
                                      width: 40,
                                      height: 40,
                                      style: { objectFit: 'contain' }
                                  }
                              } : {
                                  type: 'div',
                                  props: {
                                      style: {
                                          width: 40,
                                          height: 40,
                                          borderRadius: '20px',
                                          backgroundColor: '#374151',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontWeight: 'bold',
                                          color: 'white'
                                      },
                                      children: teamName.charAt(0).toUpperCase()
                                  }
                              },
                              {
                                  type: 'span',
                                  props: {
                                      children: teamName,
                                      style: { fontSize: '24px', fontWeight: 600, color: 'white' }
                                  }
                              }
                          ]
                      }
                  },
                  // MP
                  {
                       type: 'div',
                      props: {
                          style: { width: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', color: '#d1d5db' },
                          children: row.played ?? 0
                      }
                  },
                  // W
                   {
                       type: 'div',
                      props: {
                          style: { width: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', color: '#d1d5db' },
                          children: row.wins ?? 0
                      }
                  },
                  // D
                   {
                       type: 'div',
                      props: {
                          style: { width: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', color: '#d1d5db' },
                          children: row.draws ?? 0
                      }
                  },
                  // L
                   {
                       type: 'div',
                      props: {
                          style: { width: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', color: '#d1d5db' },
                          children: row.losses ?? 0
                      }
                  },
                  // GD
                   {
                       type: 'div',
                      props: {
                          style: { width: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', fontWeight: 600, color: (row.goalDiff > 0 ? '#4ade80' : row.goalDiff < 0 ? '#f87171' : '#9ca3af') },
                          children: row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff ?? 0
                      }
                  },
                  // Pts
                   {
                       type: 'div',
                      props: {
                          style: { width: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '32px', fontWeight: 800, color: 'white' },
                          children: row.points ?? 0
                      }
                  },
              ]
          }
      }
  }

  // Generate Table Content (group-separated if multi-group)
  let tableContent: any[] = []
  if (hasMultipleGroups) {
      distinctGroups.forEach((groupName: any, gIdx: number) => {
          const groupRows = standings.filter((s: any) => (s.group || s.participant?.group?.name) === groupName)
          tableContent.push({
              type: 'div',
              props: {
                  style: {
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 24px',
                      backgroundColor: 'rgba(99, 102, 241, 0.2)',
                      borderTop: gIdx > 0 ? '2px solid rgba(255,255,255,0.15)' : 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      marginTop: gIdx > 0 ? '14px' : '0px',
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#a5b4fc',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase'
                  },
                  children: groupName
              }
          })
          tableContent.push(...groupRows.map((row: any, index: number) => renderTableRow(row, index)))
      })
  } else {
      tableContent = standings.map((row: any, index: number) => renderTableRow(row, index))
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
                width: '100%',
                position: 'relative', // Stack on top of background
                color: 'white',
                padding: '48px 60px 0px 60px'
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
                        gap: '12px',
                        marginBottom: '32px',
                        width: '100%'
                      },
                      children: [
                        {
                            type: 'div',
                            props: {
                                style: { display: 'flex', alignItems: 'center', gap: '20px' },
                                children: [
                                    tournament.logoUrl ? {
                                        type: 'img',
                                        props: {
                                            src: tournament.logoUrl,
                                            width: 60,
                                            height: 60,
                                            style: { borderRadius: '12px' }
                                        }
                                    } : null,
                                    {
                                        type: 'span',
                                        props: {
                                            children: tournament.name,
                                            style: { fontSize: '48px', fontWeight: 800, color: 'white' }
                                        }
                                    }
                                ]
                            }
                        },
                         {
                            type: 'span',
                            props: {
                                children: title || 'Standings',
                                style: { fontSize: '32px', color: '#9ca3af', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' } 
                            }
                        }
                      ]
                    }
                  },
                  // Table Header
                  {
                      type: 'div',
                      props: {
                          style: {
                              display: 'flex',
                              width: '100%',
                              padding: '14px 24px',
                              borderBottom: '2px solid rgba(255,255,255,0.2)',
                              fontSize: '22px',
                              fontWeight: 700,
                              color: '#d1d5db'
                          },
                          children: [
                              { type: 'div', props: { style: { width: '60px', display: 'flex', justifyContent: 'center' }, children: 'Pos' } },
                              { type: 'div', props: { style: { flex: 1, display: 'flex', paddingLeft: '16px' }, children: 'Team' } },
                              { type: 'div', props: { style: { width: '80px', display: 'flex', justifyContent: 'center' }, children: 'P' } },
                              { type: 'div', props: { style: { width: '80px', display: 'flex', justifyContent: 'center' }, children: 'W' } },
                              { type: 'div', props: { style: { width: '80px', display: 'flex', justifyContent: 'center' }, children: 'D' } },
                              { type: 'div', props: { style: { width: '80px', display: 'flex', justifyContent: 'center' }, children: 'L' } },
                              { type: 'div', props: { style: { width: '100px', display: 'flex', justifyContent: 'center' }, children: 'GD' } },
                              { type: 'div', props: { style: { width: '100px', display: 'flex', justifyContent: 'center', color: 'white' }, children: 'Pts' } },
                          ]
                      }
                  },
                  // Table Body
                  {
                      type: 'div',
                      props: {
                          style: {
                              display: 'flex',
                              flexDirection: 'column',
                              width: '100%',
                          },
                          children: tableContent
                      }
                  },
                  // Footer with Sponsors and Socials
                  (sponsors && sponsors.length > 0) ? {
                    type: 'div',
                    props: {
                        style: { 
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          marginTop: '20px',
                          marginBottom: '8px',
                          gap: '12px',
                          width: '100%'
                        },
                        children: [
                          getSponsorsRow(sponsors),
                        ].filter(Boolean)
                    }
                  } : null,
                  ...getAbsoluteFooter(socials)
              ].filter(Boolean)
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
  const filename = `${tournament.name}-standings`.replace(/[^a-z0-9]/gi, '_').toLowerCase()
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
  }, 'standing')
})
