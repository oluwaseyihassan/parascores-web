import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Define a location for the cache
// In production (e.g. Vercel), we can only write to /tmp
// In development, we might want to use node_modules/.cache for persistence, 
// but /tmp is safer and easier to manage across environments.
const CACHE_DIR = join(tmpdir(), 'parascores-graphics-cache')

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
    try {
        mkdirSync(CACHE_DIR, { recursive: true })
    } catch (e) {
        console.error('Failed to create graphics cache directory', e)
    }
}

export async function useGraphicsCache(event: any, generator: (body: any) => Promise<Buffer | Blob>, suffix: string = 'graphic') {
    // 1. Read the body
    const body = await readBody(event)
    
    // 2. Generate a hash of the body
    const hash = createHash('sha256').update(JSON.stringify(body || {})).digest('hex')
    const filename = `${hash}-${suffix}.png`
    const filepath = join(CACHE_DIR, filename)
    
    // 3. Check if cached file exists
    if (existsSync(filepath)) {
        // console.log(`[Graphics Cache] Hit: ${filename}`)
        const buffer = readFileSync(filepath)
        setResponseHeader(event, 'Content-Type', 'image/png')
        // Add a header to indicate cache hit (useful for debugging)
        setResponseHeader(event, 'X-Graphics-Cache', 'HIT')
        return buffer
    }
    
    // console.log(`[Graphics Cache] Miss: ${filename}`)
    
    // 4. Generate the graphic
    // generator expects body, returns Buffer (or Blob which we convert)
    const result = await generator(body)
    
    let buffer: Buffer
    if (Buffer.isBuffer(result)) {
        buffer = result
    } else if (result instanceof Blob) {
      buffer = Buffer.from(await result.arrayBuffer())
    } else {
       // Assume it's an ArrayBuffer or similar if possible, or just fail safely
       buffer = Buffer.from(result as any)
    }
    
    // 5. Save to cache (fire and forget or await?)
    // Sync write is safer for now to ensure it's there for immediate next request if any, 
    // though async would be better for perf. Given it's image gen, disk I/O is negligible compared to generation.
    try {
        writeFileSync(filepath, buffer)
    } catch (e) {
        console.error('Failed to write to graphics cache', e)
    }
    
    setResponseHeader(event, 'X-Graphics-Cache', 'MISS')
    setResponseHeader(event, 'Content-Type', 'image/png')
    return buffer
}
