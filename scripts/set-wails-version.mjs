import fs from 'node:fs'
import path from 'node:path'

const version = process.argv[2]?.trim()
const targetFile = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.resolve(process.cwd(), 'wails.json')

if (!version) {
  console.error('Usage: bun ./scripts/set-wails-version.mjs <version> [wails.json path]')
  process.exit(1)
}

if (!/^[0-9]{2}\.[0-9]{4}\.[0-9]{4}$/.test(version)) {
  console.error(`Invalid version: ${version}. Expected yy.MMdd.HHmm`)
  process.exit(1)
}

const raw = fs.readFileSync(targetFile, 'utf8')
const config = JSON.parse(raw)
config.info = {
  ...(config.info ?? {}),
  productVersion: version,
}

fs.writeFileSync(targetFile, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
console.log(`Updated ${targetFile} -> info.productVersion=${version}`)
