import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env')

if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return

      const normalized = trimmed.startsWith('export ')
        ? trimmed.slice('export '.length).trim()
        : trimmed
      const separatorIndex = normalized.indexOf('=')
      if (separatorIndex <= 0) return

      const key = normalized.slice(0, separatorIndex).trim()
      let value = normalized.slice(separatorIndex + 1).trim()

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      if (process.env[key] === undefined) {
        process.env[key] = value
      }
    })
}
