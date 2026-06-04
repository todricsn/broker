import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const rootDir = process.cwd()
const accessPath = path.join(rootDir, 'access.json')
const errors = []

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (error) {
    errors.push(`${relative(filePath)}: JSON не читается (${error.message})`)
    return null
  }
}

function relative(filePath) {
  return path.relative(rootDir, filePath)
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function requireString(source, key, filePath) {
  if (typeof source?.[key] !== 'string') {
    errors.push(`${relative(filePath)}: поле "${key}" должно быть строкой`)
  }
}

function checkAsset(assetPath, filePath, label, allowEmpty = false) {
  if (!assetPath && allowEmpty) {
    return
  }

  if (typeof assetPath !== 'string' || !assetPath) {
    errors.push(`${relative(filePath)}: поле "${label}" должно содержать путь к файлу`)
    return
  }

  if (assetPath.includes('..')) {
    errors.push(`${relative(filePath)}: путь "${assetPath}" не должен содержать ".."`)
    return
  }

  const normalizedPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath
  const fullPath = path.join(rootDir, normalizedPath)

  if (!existsSync(fullPath)) {
    errors.push(`${relative(filePath)}: файл "${assetPath}" из поля "${label}" не найден`)
  }
}

function validateProfile(client, filePath) {
  if (!isObject(client.profile)) {
    errors.push(`${relative(filePath)}: блок "profile" обязателен`)
    return
  }

  for (const key of ['fullName', 'balance', 'saldo', 'remainder', 'notice']) {
    requireString(client.profile, key, filePath)
  }
}

function validateEptsRecords(client, filePath) {
  if (!isObject(client.eptsRecords)) {
    errors.push(`${relative(filePath)}: блок "eptsRecords" обязателен`)
    return
  }

  for (const [recordKey, record] of Object.entries(client.eptsRecords)) {
    if (!isObject(record)) {
      errors.push(`${relative(filePath)}: ЭПТС "${recordKey}" должен быть объектом`)
      continue
    }

    for (const key of [
      'epts',
      'title',
      'brand',
      'year',
      'vin',
      'body',
      'color',
      'type',
      'engineVolume',
      'power',
      'country',
      'loadMass',
      'maxMass',
      'eco',
      'engineType',
      'drive',
      'gearbox',
      'status',
      'statusDate',
    ]) {
      requireString(record, key, filePath)
    }

    checkAsset(record.lotPhoto, filePath, `eptsRecords.${recordKey}.lotPhoto`, true)
  }
}

function validateTrackingCodes(client, filePath) {
  if (!isObject(client.trackingCodes)) {
    errors.push(`${relative(filePath)}: блок "trackingCodes" обязателен`)
    return
  }

  for (const [trackingCode, transport] of Object.entries(client.trackingCodes)) {
    if (!isObject(transport)) {
      errors.push(`${relative(filePath)}: транспорт "${trackingCode}" должен быть объектом`)
      continue
    }

    requireString(transport, 'transportName', filePath)
    checkAsset(transport.photo, filePath, `trackingCodes.${trackingCode}.photo`)

    if (!Array.isArray(transport.statuses)) {
      errors.push(`${relative(filePath)}: trackingCodes.${trackingCode}.statuses должен быть массивом`)
      continue
    }

    transport.statuses.forEach((status, index) => {
      if (!isObject(status)) {
        errors.push(`${relative(filePath)}: статус #${index + 1} у "${trackingCode}" должен быть объектом`)
        return
      }

      requireString(status, 'date', filePath)
      requireString(status, 'text', filePath)
    })
  }
}

const accessMap = readJson(accessPath)

if (!isObject(accessMap)) {
  errors.push('access.json: должен быть объектом вида "код": "clients/код.json"')
}

if (isObject(accessMap)) {
  for (const [accessCode, clientFile] of Object.entries(accessMap)) {
    if (!/^\d+$/.test(accessCode)) {
      errors.push(`access.json: код "${accessCode}" должен состоять только из цифр`)
    }

    if (typeof clientFile !== 'string') {
      errors.push(`access.json: путь для кода "${accessCode}" должен быть строкой`)
      continue
    }

    if (clientFile.includes('..')) {
      errors.push(`access.json: путь "${clientFile}" не должен содержать ".."`)
      continue
    }

    const clientPath = path.join(rootDir, clientFile)

    if (!existsSync(clientPath)) {
      errors.push(`access.json: файл для кода "${accessCode}" не найден (${clientFile})`)
      continue
    }

    const client = readJson(clientPath)

    if (!client) {
      continue
    }

    validateProfile(client, clientPath)
    validateEptsRecords(client, clientPath)
    validateTrackingCodes(client, clientPath)
  }
}

if (errors.length > 0) {
  console.error('Ошибки в файлах данных:')
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Файлы данных проверены')
