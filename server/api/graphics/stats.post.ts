import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { getSponsorsRow, getAbsoluteFooter } from '../../utils/graphics'
import { useGraphicsCache } from '../../utils/cache'

export default defineEventHandler(async (event) => {
  return useGraphicsCache(event, async (body: any) => {
  try {
    const { stats, statType = 'both', tournament, sponsors = [], socials = [], transparent = false } = body

    if (!stats || !tournament) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing stats or tournament data'
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
        throw createError({ statusCode: 500, statusMessage: 'Failed to load required assets (fonts)' })
    }

  const { topScorers = [], topAssists = [] } = stats
  
  const addRanks = (items: any[]) => {
      let currentRank = 1
      let currentCount = -1
      return items.map((item, index) => {
          if (item.count !== currentCount) {
              currentRank = index + 1
              currentCount = item.count
          }
          return { ...item, rank: currentRank }
      })
  }

  // Cut down to top 5 for graphics to fit perfectly
  const displayScorers = addRanks(topScorers).slice(0, 5)
  const displayAssists = addRanks(topAssists).slice(0, 5)

  const width = 1200
  const baseHeight = 900
  const height = baseHeight

  const backgroundLayers = []
  if (!transparent) {
      if (tournament.bannerUrl) {
          backgroundLayers.push({
              type: 'img',
              props: {
                  src: tournament.bannerUrl, width: width, height: height,
                  style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(15px)', transform: 'scale(1.1)' }
              }
          })
          backgroundLayers.push({
              type: 'div',
              props: { style: { display: 'flex', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(17, 24, 39, 0.8)' } }
          })
      } else {
           backgroundLayers.push({
              type: 'div',
              props: { style: { display: 'flex', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#111827', backgroundImage: 'radial-gradient(circle at 25% 0%, #312e81 0%, #111827 50%)' } }
          })
      }
  }

  const renderStatRow = (item: any, index: number, color: string) => {
      const rankIndex = item.rank - 1
      const bgColor = rankIndex === 0 ? 'rgba(245, 158, 11, 0.2)' : rankIndex === 1 ? 'rgba(203, 213, 225, 0.2)' : rankIndex === 2 ? 'rgba(180, 83, 9, 0.2)' : 'rgba(255, 255, 255, 0.05)'
      const ringColor = rankIndex === 0 ? 'rgba(245, 158, 11, 0.3)' : rankIndex === 1 ? 'rgba(203, 213, 225, 0.3)' : rankIndex === 2 ? 'rgba(180, 83, 9, 0.3)' : 'transparent'
      const textColor = rankIndex === 0 ? '#fbbf24' : rankIndex === 1 ? '#cbd5e1' : rankIndex === 2 ? '#d97706' : '#9ca3af'
      
      return {
          type: 'div',
          props: {
              style: {
                  display: 'flex', alignItems: 'center', width: '100%', padding: '16px 24px',
                  backgroundColor: 'rgba(31, 41, 55, 0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', marginBottom: '12px'
              },
              children: [
                  // Rank badge
                  {
                      type: 'div',
                      props: {
                          style: {
                              display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '20px',
                              backgroundColor: bgColor, color: textColor, border: `1px solid ${ringColor}`, fontSize: '18px', fontWeight: 'bold', marginRight: '20px'
                          },
                          children: String(item.rank)
                      }
                  },
                  // Details
                  {
                      type: 'div',
                      props: {
                          style: { display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' },
                          children: [
                              {
                                  type: 'div',
                                  props: {
                                      style: { display: 'flex', alignItems: 'center', gap: '8px' },
                                      children: [
                                          { type: 'span', props: { children: item.player.name, style: { color: 'white', fontSize: '20px', fontWeight: 600 } } },
                                          item.player.number ? { type: 'span', props: { children: `#${item.player.number}`, style: { color: '#6b7280', fontSize: '14px', fontFamily: 'Roboto Mono' } } } : null
                                      ].filter(Boolean)
                                  }
                              },
                              {
                                  type: 'div',
                                  props: {
                                      style: { display: 'flex', alignItems: 'center', gap: '8px' },
                                      children: [
                                          item.teamLogoUrl ? { type: 'img', props: { src: item.teamLogoUrl, width: 20, height: 20, style: { objectFit: 'cover', borderRadius: '10px' } } } : null,
                                          { type: 'span', props: { children: item.teamName, style: { color: '#9ca3af', fontSize: '14px' } } }
                                      ].filter(Boolean)
                                  }
                              }
                          ]
                      }
                  },
                  // Count
                  {
                      type: 'div',
                      props: {
                          style: { display: 'flex', alignItems: 'center', justifyContent: 'center', color: color, fontSize: '32px', fontWeight: 'bold', fontFamily: 'Roboto Mono' },
                          children: String(item.count)
                      }
                  }
              ]
          }
      }
  }

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: { display: 'flex', height: '100%', width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: transparent ? 'transparent' : '#111827', fontFamily: 'Inter' },
        children: [
          ...backgroundLayers,
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '60px', width: '100%', height: '100%', position: 'relative', color: 'white' },
              children: [
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px', gap: '8px' },
                      children: [
                        {
                            type: 'div',
                            props: {
                                style: { display: 'flex', alignItems: 'center', gap: '16px' },
                                children: [
                                    tournament.logoUrl ? { type: 'img', props: { src: tournament.logoUrl, width: 56, height: 56, style: { borderRadius: '8px' } } } : null,
                                    { type: 'span', props: { children: tournament.name, style: { fontSize: '32px', color: '#e5e7eb', fontWeight: 600 } } }
                                ].filter(Boolean)
                            }
                        },
                        { type: 'span', props: { children: 'Player Statistics', style: { fontSize: '20px', color: '#34d399', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' } } }
                      ]
                    }
                  },
                  {
                      type: 'div',
                      props: {
                          style: { display: 'flex', width: '85%', gap: '40px', justifyContent: 'center' },
                          children: [
                              // Top Scorers Column
                              (statType === 'both' || statType === 'scorers') ? {
                                  type: 'div',
                                  props: {
                                      style: { display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px' },
                                      children: [
                                          {
                                              type: 'div',
                                              props: {
                                                  style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
                                                  children: [
                                                      { type: 'div', props: { style: { width: '8px', height: '24px', backgroundColor: '#34d399', borderRadius: '4px' } } },
                                                      { type: 'span', props: { children: 'Top Scorers', style: { fontSize: '24px', fontWeight: 'bold', color: 'white' } } }
                                                  ]
                                              }
                                          },
                                          displayScorers.length > 0 ? {
                                              type: 'div',
                                              props: { style: { display: 'flex', flexDirection: 'column', width: '100%' }, children: displayScorers.map((item: any, i: number) => renderStatRow(item, i, '#34d399')) }
                                          } : {
                                              type: 'div',
                                              props: { style: { display: 'flex', padding: '40px', color: '#6b7280', fontSize: '18px', justifyContent: 'center' }, children: 'No goals recorded yet' }
                                          }
                                      ]
                                  }
                              } : null,
                              // Top Assists Column
                              (statType === 'both' || statType === 'assists') ? {
                                  type: 'div',
                                  props: {
                                      style: { display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px' },
                                      children: [
                                          {
                                              type: 'div',
                                              props: {
                                                  style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
                                                  children: [
                                                      { type: 'div', props: { style: { width: '8px', height: '24px', backgroundColor: '#22d3ee', borderRadius: '4px' } } },
                                                      { type: 'span', props: { children: 'Top Assists', style: { fontSize: '24px', fontWeight: 'bold', color: 'white' } } }
                                                  ]
                                              }
                                          },
                                          displayAssists.length > 0 ? {
                                              type: 'div',
                                              props: { style: { display: 'flex', flexDirection: 'column', width: '100%' }, children: displayAssists.map((item: any, i: number) => renderStatRow(item, i, '#22d3ee')) }
                                          } : {
                                              type: 'div',
                                              props: { style: { display: 'flex', padding: '40px', color: '#6b7280', fontSize: '18px', justifyContent: 'center' }, children: 'No assists recorded yet' }
                                          }
                                      ]
                                  }
                              } : null
                          ].filter(Boolean)
                      }
                  },
                  {
                    type: 'div',
                    props: {
                        style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', paddingTop: '50px', paddingBottom: '80px', gap: '16px', width: '100%' },
                        children: [ getSponsorsRow(sponsors) ].filter(Boolean)
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
      width, height,
      fonts: [
        { name: 'Inter', data: fontData, weight: 700, style: 'normal', },
        { name: 'Inter', data: regularFontData, weight: 400, style: 'normal', },
        { name: 'Roboto Mono', data: monoFontData, weight: 700, style: 'normal', },
      ],
    }
  )

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()

  setResponseHeader(event, 'Content-Type', 'image/png')
  const filename = `${tournament.customName || 'tournament'}-stats`.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}.png"`)

  return pngBuffer
  } catch (e: any) {
      console.error('Graphics Generation Error:', e)
      throw createError({ statusCode: e.statusCode || 500, statusMessage: e.statusMessage || 'Failed to generate graphic', data: e.message })
  }
  }, 'stats-graphic')
})
