import { cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const rootDir = process.cwd()
const distDir = path.join(rootDir, 'dist')

await rm(distDir, {
  force: true,
  recursive: true,
})
await mkdir(distDir, {
  recursive: true,
})

for (const item of [
  'index.html',
  'epts.html',
  'tracking.html',
  'README.md',
  'favicon.png',
  'access.json',
  'assets',
  'clients',
]) {
  await cp(path.join(rootDir, item), path.join(distDir, item), {
    recursive: true,
  })
}

console.log('Статическая сборка готова: dist')
