const navTargets = {
  home: {
    targetId: 'dashboardStart',
  },
  epts: {
    targetId: 'eptsPanel',
    focusId: 'eptsCode',
  },
  tracking: {
    targetId: 'trackingPanel',
    focusId: 'trackingCode',
  },
}

const currentPage = document.body.dataset.page || 'home'
const usesCleanUrls = !window.location.pathname.endsWith('.html')
const siteRoot = usesCleanUrls && currentPage !== 'home' ? '../' : './'
const pageRoutes = usesCleanUrls
  ? currentPage === 'home'
    ? {
        home: './',
        epts: 'epts/',
        tracking: 'tracking/',
      }
    : {
        home: '../',
        epts: '../epts/',
        tracking: '../tracking/',
      }
  : {
      home: 'index.html',
      epts: 'epts.html',
      tracking: 'tracking.html',
    }
const accessCodeStorageKey = 'brokerAccessCode'
const timerStoragePrefix = 'brokerTimerDeadline'

const trackingLetterMap = {
  А: 'A',
  В: 'B',
  Е: 'E',
  К: 'K',
  М: 'M',
  Н: 'H',
  О: 'O',
  Р: 'P',
  С: 'C',
  Т: 'T',
  У: 'Y',
  Х: 'X',
}

const state = {
  accessCode: '',
  client: null,
  activeTrackingCode: '',
  timerIntervalId: null,
  timerStorageKey: '',
  timerDeadline: 0,
}

const els = {
  app: document.getElementById('app'),
  loginPage: document.getElementById('loginPage'),
  cabinetPage: document.getElementById('cabinetPage'),
  loginForm: document.getElementById('loginForm'),
  accessCode: document.getElementById('accessCode'),
  loginButton: document.getElementById('loginButton'),
  loginError: document.getElementById('loginError'),
  activeAccessCode: document.getElementById('activeAccessCode'),
  menuButton: document.getElementById('menuButton'),
  portalBody: document.querySelector('.portal-body'),
  workspace: document.querySelector('.workspace'),
  sidebar: document.getElementById('cabinetSidebar'),
  headerLogout: document.getElementById('headerLogout'),
  sidebarLogout: document.getElementById('sidebarLogout'),
  profileFullName: document.getElementById('profileFullName'),
  profileNotice: document.getElementById('profileNotice'),
  profileNoticeText: document.getElementById('profileNoticeText'),
  cabinetTimer: document.getElementById('cabinetTimer'),
  timerLabel: document.getElementById('timerLabel'),
  timerDays: document.getElementById('timerDays'),
  timerHours: document.getElementById('timerHours'),
  timerMinutes: document.getElementById('timerMinutes'),
  timerSeconds: document.getElementById('timerSeconds'),
  profileBalance: document.getElementById('profileBalance'),
  profileSaldo: document.getElementById('profileSaldo'),
  profileRemainder: document.getElementById('profileRemainder'),
  eptsForm: document.getElementById('eptsForm'),
  eptsCode: document.getElementById('eptsCode'),
  eptsError: document.getElementById('eptsError'),
  trackingForm: document.getElementById('trackingForm'),
  trackingCode: document.getElementById('trackingCode'),
  trackingError: document.getElementById('trackingError'),
  trackingOutput: document.getElementById('trackingOutput'),
  productModal: document.getElementById('productModal'),
  modalGrid: document.getElementById('modalGrid'),
  modalStatus: document.getElementById('modalStatus'),
  modalStatusDate: document.getElementById('modalStatusDate'),
}

els.loginForm.addEventListener('submit', handleLogin)
els.eptsForm.addEventListener('submit', handleCheckEpts)
els.trackingForm.addEventListener('submit', handleFindTracking)
els.accessCode.addEventListener('input', () => {
  els.accessCode.value = els.accessCode.value.replace(/\D/g, '')
})
els.eptsCode.addEventListener('input', () => {
  els.eptsCode.value = els.eptsCode.value.replace(/\D/g, '')
})
els.trackingCode.addEventListener('input', () => {
  els.trackingCode.value = els.trackingCode.value.toUpperCase()
})
els.menuButton.addEventListener('click', toggleSidebar)
els.headerLogout.addEventListener('click', logout)
els.sidebarLogout.addEventListener('click', logout)
document.querySelectorAll('[data-nav]').forEach((button) => {
  button.addEventListener('click', () => navigateTo(button.dataset.nav))
})
document.querySelectorAll('.modal-close').forEach((button) => {
  button.addEventListener('click', closeProductModal)
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeProductModal()
  }
})
setupPageLayout()
restoreSavedSession()

async function handleLogin(event) {
  event.preventDefault()
  const accessCode = els.accessCode.value.trim()

  if (!accessCode) {
    showLoginError('Введите код доступа')
    return
  }

  setLoginLoading(true)
  showLoginError('')

  try {
    const client = await loadClient(accessCode)

    state.accessCode = accessCode
    state.client = client
    state.activeTrackingCode = ''
    saveAccessCode(accessCode)
    renderCabinet()
  } catch (error) {
    showLoginError(
      error.message === 'client-not-found'
        ? 'Код доступа не найден'
        : 'Ошибка чтения файла данных',
    )
  } finally {
    setLoginLoading(false)
  }
}

async function loadClient(accessCode) {
  const accessMap = await fetchJson('access.json')
  const clientFile = accessMap[accessCode]

  if (!clientFile) {
    throw new Error('client-not-found')
  }

  return fetchJson(clientFile)
}

async function fetchJson(path) {
  const response = await fetch(resolveSitePath(path), {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('file-not-found')
  }

  return response.json()
}

async function restoreSavedSession() {
  const accessCode = readSavedAccessCode()

  if (!accessCode) {
    return
  }

  setLoginLoading(true)

  try {
    const client = await loadClient(accessCode)

    state.accessCode = accessCode
    state.client = client
    state.activeTrackingCode = ''
    renderCabinet()
  } catch (error) {
    clearSavedAccessCode()
    showLoginError('Сессия устарела. Введите код доступа еще раз.')
  } finally {
    setLoginLoading(false)
  }
}

function renderCabinet() {
  const profile = state.client.profile

  els.activeAccessCode.textContent = state.accessCode
  els.profileFullName.textContent = profile.fullName
  els.profileBalance.textContent = profile.balance
  els.profileSaldo.textContent = profile.saldo
  els.profileRemainder.textContent = profile.remainder
  renderProfileNotice(profile.notice)
  startCabinetTimer(state.client.timer)

  els.eptsCode.value = ''
  els.eptsError.textContent = ''
  els.trackingCode.value = ''
  els.trackingError.textContent = ''
  renderTrackingEmpty()
  setActiveNav(currentPage)
  if (window.matchMedia('(max-width: 820px)').matches) {
    closeSidebar()
  } else {
    openSidebar()
  }
  closeProductModal()

  els.app.className = 'broker-frame dashboard-page'
  els.loginPage.classList.add('hidden')
  els.cabinetPage.classList.remove('hidden')
}

function setupPageLayout() {
  if (currentPage === 'epts') {
    els.workspace.append(els.productModal)
  }
}

function renderProfileNotice(notice) {
  const text = typeof notice === 'string' ? notice.trim() : ''

  els.profileNoticeText.textContent = text
  els.profileNotice.hidden = !text
}

function logout() {
  state.accessCode = ''
  state.client = null
  state.activeTrackingCode = ''
  stopCabinetTimer({ clearStorage: true })
  clearSavedAccessCode()

  els.accessCode.value = ''
  els.loginError.textContent = ''
  closeProductModal()
  closeSidebar()

  els.app.className = 'broker-frame login-page'
  els.cabinetPage.classList.add('hidden')
  els.loginPage.classList.remove('hidden')
  window.setTimeout(() => els.accessCode.focus(), 0)
}

function handleCheckEpts(event) {
  event.preventDefault()
  const records = state.client?.eptsRecords ?? {}
  const code = els.eptsCode.value.trim()
  const record = records[code]

  if (!record) {
    els.eptsError.textContent = 'ЭПТС не найден'
    closeProductModal()
    return
  }

  els.eptsError.textContent = ''
  openProductModal(record)
}

function handleFindTracking(event) {
  event.preventDefault()
  const trackingCodes = state.client?.trackingCodes ?? {}
  const normalizedCode = normalizeTrackingCode(els.trackingCode.value)
  const transport = trackingCodes[normalizedCode]

  if (!transport) {
    els.trackingError.textContent = 'Код транспорта не найден'
    state.activeTrackingCode = ''
    renderTrackingEmpty()
    return
  }

  els.trackingCode.value = normalizedCode
  els.trackingError.textContent = ''
  state.activeTrackingCode = normalizedCode
  renderTrackingResult(transport)
}

function renderTrackingEmpty() {
  els.trackingOutput.className = 'tracking-empty'
  els.trackingOutput.textContent = 'Введите код транспорта и нажмите проверку.'
}

function renderTrackingResult(transport) {
  els.trackingOutput.className = 'tracking-result'
  els.trackingOutput.innerHTML = `
    <div class="transport-summary">
      ${renderImageOrError(transport.photo, transport.transportName, 'transport-image-error', 'IMAGE ERROR')}
      <div>
        <span>Наименование транспорта</span>
        <strong>${escapeHtml(transport.transportName)}</strong>
      </div>
    </div>
    <ol class="tracking-statuses">
      ${transport.statuses
        .map(
          (item) => `
            <li>
              <time>${escapeHtml(item.date)}</time>
              <span>${escapeHtml(item.text)}</span>
            </li>
          `,
        )
        .join('')}
    </ol>
  `

  bindImageFallbacks(els.trackingOutput)
}

function openProductModal(record) {
  const vehicleRows = [
    ['ЭПТС:', record.epts],
    ['Марка, модель:', record.brand],
    ['Год выпуска:', record.year],
    ['VIN:', record.vin],
    ['№ кузова:', record.body],
    ['Цвет:', record.color],
    ['Тип ТС:', record.type],
    ['Страна изготовитель:', record.country],
  ]

  const techRows = [
    ['Объем двигателя:', record.engineVolume],
    ['Мощность:', record.power],
    ['Экологический класс:', record.eco],
    ['Тип двигателя:', record.engineType],
    ['Привод:', record.drive],
    ['КПП:', record.gearbox],
    ['Масса без нагрузки:', record.loadMass],
    ['Разрешенная макс. масса:', record.maxMass],
  ]

  els.modalGrid.innerHTML = `
    <div class="modal-photo">
      <h3>ФОТО лота (JPEG/JPG)</h3>
      ${renderImageOrError(record.lotPhoto, `Фото лота ${record.title}`, 'image-error', 'image error')}
    </div>
    ${renderInfoColumn('Информация о транспортном средстве', vehicleRows)}
    ${renderInfoColumn('Технические характеристики', techRows)}
  `

  els.modalStatus.textContent = record.status
  els.modalStatus.className = `status ${statusClass(record.status)}`
  els.modalStatusDate.textContent = record.statusDate
  els.productModal.classList.remove('hidden')
  bindImageFallbacks(els.productModal)
}

function closeProductModal() {
  els.productModal.classList.add('hidden')
}

function startCabinetTimer(timerConfig) {
  stopCabinetTimer()

  if (!els.cabinetTimer) {
    return
  }

  const timer = normalizeTimerConfig(timerConfig)

  if (!timer) {
    els.cabinetTimer.hidden = true
    setTimerDisplay(0)
    return
  }

  const storageKey = `${timerStoragePrefix}:${state.accessCode}:${timer.signature}`
  const savedDeadline = readTimerDeadline(storageKey)
  const deadline = savedDeadline ?? Date.now() + timer.totalSeconds * 1000

  state.timerStorageKey = storageKey
  state.timerDeadline = deadline
  els.timerLabel.textContent = timer.label
  els.cabinetTimer.hidden = false
  saveTimerDeadline(storageKey, deadline)
  updateCabinetTimer()

  if (timer.totalSeconds > 0 && deadline > Date.now()) {
    state.timerIntervalId = window.setInterval(updateCabinetTimer, 1000)
  }
}

function stopCabinetTimer(options = {}) {
  if (state.timerIntervalId) {
    window.clearInterval(state.timerIntervalId)
  }

  if (options.clearStorage && state.timerStorageKey) {
    clearTimerDeadline(state.timerStorageKey)
  }

  state.timerIntervalId = null
  state.timerStorageKey = ''
  state.timerDeadline = 0
}

function updateCabinetTimer() {
  const remainingSeconds = Math.max(
    0,
    Math.ceil((state.timerDeadline - Date.now()) / 1000),
  )

  setTimerDisplay(remainingSeconds)

  if (remainingSeconds === 0 && state.timerIntervalId) {
    window.clearInterval(state.timerIntervalId)
    state.timerIntervalId = null
  }
}

function setTimerDisplay(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  els.timerDays.textContent = formatTimerPart(days)
  els.timerHours.textContent = formatTimerPart(hours)
  els.timerMinutes.textContent = formatTimerPart(minutes)
  els.timerSeconds.textContent = formatTimerPart(seconds)
  els.cabinetTimer.classList.toggle('expired', totalSeconds === 0)
}

function normalizeTimerConfig(timerConfig) {
  if (!timerConfig || typeof timerConfig !== 'object' || timerConfig.enabled === false) {
    return null
  }

  const days = readTimerPart(timerConfig.days)
  const hours = readTimerPart(timerConfig.hours)
  const minutes = readTimerPart(timerConfig.minutes)
  const seconds = readTimerPart(timerConfig.seconds)
  const totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds

  return {
    label: typeof timerConfig.label === 'string' ? timerConfig.label : 'Осталось времени:',
    signature: [days, hours, minutes, seconds].join('-'),
    totalSeconds,
  }
}

function readTimerPart(value) {
  const number = Number.parseInt(value, 10)

  if (!Number.isFinite(number) || number < 0) {
    return 0
  }

  return number
}

function formatTimerPart(value) {
  return String(value).padStart(2, '0')
}

function renderInfoColumn(title, rows) {
  return `
    <section class="modal-info-column">
      <h3>${escapeHtml(title)}</h3>
      <dl>
        ${rows
          .map(
            ([label, value]) => `
              <div>
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(value)}</dd>
              </div>
            `,
          )
          .join('')}
      </dl>
    </section>
  `
}

function renderImageOrError(src, alt, className, text) {
  if (!src) {
    return `<div class="${className}">${escapeHtml(text)}</div>`
  }

  return `
    <img
      src="${escapeAttribute(resolveSitePath(src))}"
      alt="${escapeAttribute(alt)}"
      data-error-class="${escapeAttribute(className)}"
      data-error-text="${escapeAttribute(text)}"
    />
  `
}

function bindImageFallbacks(container) {
  container.querySelectorAll('img[data-error-class]').forEach((image) => {
    image.addEventListener(
      'error',
      () => {
        const fallback = document.createElement('div')
        fallback.className = image.dataset.errorClass
        fallback.textContent = image.dataset.errorText
        image.replaceWith(fallback)
      },
      { once: true },
    )
  })
}

function navigateTo(section) {
  const target = navTargets[section]
  const route = pageRoutes[section]

  if (!target || !route) {
    return
  }

  if (section !== currentPage) {
    window.location.href = route
    return
  }

  setActiveNav(section)

  window.setTimeout(() => {
    document.getElementById(target.targetId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })

    if (target.focusId) {
      window.setTimeout(() => {
        document.getElementById(target.focusId)?.focus({
          preventScroll: true,
        })
      }, 260)
    }
  }, 0)
}

function setActiveNav(section) {
  document.querySelectorAll('[data-nav]').forEach((button) => {
    const isActive = button.dataset.nav === section
    button.classList.toggle('active', isActive)

    if (isActive) {
      button.setAttribute('aria-current', 'page')
    } else {
      button.removeAttribute('aria-current')
    }
  })
}

function toggleSidebar() {
  const nextState = !els.sidebar.classList.contains('open')
  els.sidebar.classList.toggle('open', nextState)
  els.portalBody.classList.toggle('sidebar-open', nextState)
  els.menuButton.setAttribute('aria-expanded', String(nextState))
  els.menuButton.setAttribute(
    'aria-label',
    nextState ? 'Закрыть навигацию' : 'Открыть навигацию',
  )
}

function openSidebar() {
  els.sidebar.classList.add('open')
  els.portalBody.classList.add('sidebar-open')
  els.menuButton.setAttribute('aria-expanded', 'true')
  els.menuButton.setAttribute('aria-label', 'Закрыть навигацию')
}

function closeSidebar() {
  els.sidebar.classList.remove('open')
  els.portalBody.classList.remove('sidebar-open')
  els.menuButton.setAttribute('aria-expanded', 'false')
  els.menuButton.setAttribute('aria-label', 'Открыть навигацию')
}

function normalizeTrackingCode(value) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[АВЕКМНОРСТУХ]/g, (letter) => trackingLetterMap[letter])
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, '')
}

function statusClass(status) {
  if (status === 'Действителен') {
    return 'valid'
  }

  if (status === 'Недействителен') {
    return 'invalid'
  }

  return 'pending'
}

function setLoginLoading(isLoading) {
  els.loginButton.disabled = isLoading
  els.loginButton.textContent = isLoading ? 'Проверка...' : 'Войти'
}

function showLoginError(text) {
  els.loginError.textContent = text
}

function saveAccessCode(accessCode) {
  try {
    sessionStorage.setItem(accessCodeStorageKey, accessCode)
  } catch (error) {
    // Кабинет продолжит работать до перезагрузки страницы.
  }
}

function readSavedAccessCode() {
  try {
    return sessionStorage.getItem(accessCodeStorageKey)
  } catch (error) {
    return ''
  }
}

function clearSavedAccessCode() {
  try {
    sessionStorage.removeItem(accessCodeStorageKey)
  } catch (error) {
    // Нечего чистить, если браузер запретил sessionStorage.
  }
}

function readTimerDeadline(storageKey) {
  try {
    const value = Number(sessionStorage.getItem(storageKey))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch (error) {
    return null
  }
}

function saveTimerDeadline(storageKey, deadline) {
  try {
    sessionStorage.setItem(storageKey, String(deadline))
  } catch (error) {
    // Таймер продолжит работать до перезагрузки страницы.
  }
}

function clearTimerDeadline(storageKey) {
  try {
    sessionStorage.removeItem(storageKey)
  } catch (error) {
    // Нечего чистить, если браузер запретил sessionStorage.
  }
}

function resolveSitePath(filePath) {
  return `${siteRoot}${String(filePath).replace(/^\.?\//, '')}`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;')
}
