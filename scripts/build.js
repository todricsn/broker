import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const rootDir = process.cwd()
const distDir = path.join(rootDir, 'dist')
const distWithoutTimerDir = path.join(rootDir, 'dist-without-timer')

const sharedItems = ['favicon.png', 'access.json', 'assets', 'clients']

await buildVariant(distDir, {
  includeTimer: true,
})
await buildVariant(distWithoutTimerDir, {
  includeTimer: false,
})

async function buildVariant(targetDir, { includeTimer }) {
  await rm(targetDir, {
    force: true,
    recursive: true,
  })
  await mkdir(targetDir, {
    recursive: true,
  })

  for (const item of sharedItems) {
    await cp(path.join(rootDir, item), path.join(targetDir, item), {
      recursive: true,
      filter: (sourcePath) => path.basename(sourcePath) !== '.DS_Store',
    })
  }

  await writePage('index.html', path.join(targetDir, 'index.html'), {
    includeTimer,
    nested: false,
  })
  await writePage('epts.html', path.join(targetDir, 'epts', 'index.html'), {
    includeTimer,
    nested: true,
  })
  await writePage('tracking.html', path.join(targetDir, 'tracking', 'index.html'), {
    includeTimer,
    nested: true,
  })

  const readme = await readFile(path.join(rootDir, 'README.md'), 'utf8')
  await writeFile(
    path.join(targetDir, 'README.md'),
    includeTimer ? readme : removeTimerInstructions(readme),
  )

  if (!includeTimer) {
    await removeTimerFromClients(path.join(targetDir, 'clients'))
    const stylesPath = path.join(targetDir, 'assets', 'css', 'styles.css')
    const styles = await readFile(stylesPath, 'utf8')
    await writeFile(
      stylesPath,
      styles.replace(
        'grid-template-columns: minmax(240px, 285px) minmax(220px, 250px) repeat(3, minmax(145px, 1fr));',
        'grid-template-columns: minmax(260px, 300px) repeat(3, minmax(170px, 1fr));',
      ),
    )

    const clientReadmePath = path.join(targetDir, 'clients', 'README.txt')
    const clientReadme = await readFile(clientReadmePath, 'utf8')
    await writeFile(
      clientReadmePath,
      clientReadme
        .replace('- таймер обратного отсчета\n', '')
        .replace(/\nКак менять таймер:[\s\S]*?(?=\nСтраницы:)/, '\n'),
    )
  }
}

async function writePage(sourceName, targetPath, { includeTimer, nested }) {
  let html = await readFile(path.join(rootDir, sourceName), 'utf8')

  if (nested) {
    html = html
      .replace('href="favicon.png"', 'href="../favicon.png"')
      .replace('href="assets/css/styles.css"', 'href="../assets/css/styles.css"')
      .replace('src="assets/js/app.js"', 'src="../assets/js/app.js"')
      .replaceAll('src="assets/customs-emblem-cut.png"', 'src="../assets/customs-emblem-cut.png"')
  }

  if (!includeTimer) {
    html = html.replace(
      /\s*<div class="metric countdown-metric"[\s\S]*?<\/div>/,
      '',
    )
  }

  await mkdir(path.dirname(targetPath), {
    recursive: true,
  })
  await writeFile(targetPath, html)
}

async function removeTimerFromClients(clientsDir) {
  const accessMap = JSON.parse(await readFile(path.join(rootDir, 'access.json'), 'utf8'))
  const clientFiles = new Set([
    ...Object.values(accessMap).map((clientPath) => path.basename(clientPath)),
    '_template.json',
  ])

  for (const fileName of clientFiles) {
    const clientPath = path.join(clientsDir, fileName)
    const client = JSON.parse(await readFile(clientPath, 'utf8'))
    delete client.timer
    await writeFile(clientPath, `${JSON.stringify(client, null, 2)}\n`)
  }
}

function removeTimerInstructions(readme) {
  return readme.replace(
    /\n## Как менять таймер[\s\S]*?(?=\n## Как менять ЭПТС)/,
    '',
  )
}

console.log('Статические сборки готовы: dist и dist-without-timer')
