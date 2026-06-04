import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const rootDir = process.cwd()
const port = Number(process.env.PORT || 5174)

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
}

createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://localhost:${port}`)
  const safePath = path.normalize(decodeURIComponent(requestUrl.pathname)).replace(/^(\.\.[/\\])+/, '')
  const relativePath = safePath === '/' ? 'index.html' : safePath.replace(/^[/\\]/, '')
  const filePath = path.join(rootDir, relativePath)

  if (!filePath.startsWith(rootDir) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    response.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8',
    })
    response.end('Файл не найден')
    return
  }

  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
  })
  createReadStream(filePath).pipe(response)
}).listen(port, () => {
  const scriptPath = fileURLToPath(import.meta.url)
  const scriptName = path.relative(rootDir, scriptPath)

  console.log(`Локальный сервер: http://127.0.0.1:${port}/`)
  console.log(`Запущено из ${scriptName}`)
})
