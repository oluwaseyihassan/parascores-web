
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { rmSync, existsSync } from 'node:fs'

const CACHE_DIR = join(tmpdir(), 'parascores-graphics-cache')

if (existsSync(CACHE_DIR)) {
    console.log(`Clearing graphics cache at: ${CACHE_DIR}`)
    try {
        rmSync(CACHE_DIR, { recursive: true, force: true })
        console.log('✅ Cache cleared successfully.')
    } catch (e) {
        console.error('❌ Failed to clear cache:', e)
    }
} else {
    console.log('ℹ️ Cache directory does not exist or is already empty.')
}
