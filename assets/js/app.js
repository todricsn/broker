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
  sidebar: document.getElementById('cabinetSidebar'),
  headerLogout: document.getElementById('headerLogout'),
  sidebarLogout: document.getElementById('sidebarLogout'),
  profileFullName: document.getElementById('profileFullName'),
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
  const response = await fetch(path, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('file-not-found')
  }

  return response.json()
}

function renderCabinet() {
  const profile = state.client.profile

  els.activeAccessCode.textContent = state.accessCode
  els.profileFullName.textContent = profile.fullName
  els.profileBalance.textContent = profile.balance
  els.profileSaldo.textContent = profile.saldo
  els.profileRemainder.textContent = profile.remainder

  els.eptsCode.value = ''
  els.eptsError.textContent = ''
  els.trackingCode.value = ''
  els.trackingError.textContent = ''
  renderTrackingEmpty()
  setActiveNav('home')
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

function logout() {
  state.accessCode = ''
  state.client = null
  state.activeTrackingCode = ''

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
      src="${escapeAttribute(src)}"
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

  if (!target) {
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
