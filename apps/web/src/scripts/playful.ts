/* Verspielt-Interaktionen: Fibonacci-Spirale, Scroll-Reveal, Gemüse-Easter-Eggs mit Toasts.
   Toast-Sprüche kommen aus Payload (Icons-Collection) und werden von Base.astro als
   JSON in #egg-data eingebettet. */

interface EggData {
  toasts: Record<string, string[]>
  total: number
  completionToast: string
  starToast: string
}

const eggData: EggData = JSON.parse(document.getElementById('egg-data')?.textContent ?? '{}')
const vegToasts = eggData.toasts ?? {}
const TOTAL = eggData.total ?? 0

const found = new Set<string>()
const clicks: Record<string, number> = {}
let toastTimer: ReturnType<typeof setTimeout> | undefined

function showToast(message: string) {
  if (!message) return
  clearTimeout(toastTimer)
  document.querySelector('.toast')?.remove()
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = message
  document.body.appendChild(el)
  toastTimer = setTimeout(() => el.remove(), 4200)
}

function updateCount() {
  document.querySelectorAll('[data-egg-count]').forEach((el) => {
    el.textContent = String(found.size)
  })
}

function initEggs() {
  document.querySelectorAll<HTMLElement>('[data-egg]').forEach((el) => {
    el.addEventListener('click', () => {
      const name = el.dataset.egg!
      const list = vegToasts[name]
      if (!list?.length) return
      const i = (clicks[name] = (clicks[name] ?? -1) + 1)
      if (!found.has(name)) {
        found.add(name)
        updateCount()
        if (found.size === TOTAL) {
          showToast(eggData.completionToast)
          return
        }
      }
      showToast(list[i % list.length])
    })
  })
  document.querySelectorAll<HTMLElement>('[data-egg-star]').forEach((el) => {
    el.addEventListener('click', () => showToast(eggData.starToast))
  })
}

function initSpiral() {
  const path = document.querySelector('[data-spiralpath]')
  if (!path) return
  const b = Math.log(1.6180339887) / (Math.PI / 2)
  let d = ''
  for (let t = -14; t <= 22.6; t += 0.08) {
    const r = Math.exp(b * t)
    d += (d ? 'L' : 'M') + (r * Math.cos(t)).toFixed(2) + ',' + (r * Math.sin(t)).toFixed(2)
  }
  path.setAttribute('d', d)
}

function initReveal() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const el = entry.target as HTMLElement
        setTimeout(() => el.classList.remove('rev-hidden'), parseInt(el.dataset.rev ?? '0'))
        io.unobserve(el)
      })
    },
    { threshold: 0.12 },
  )
  document.querySelectorAll<HTMLElement>('[data-rev]').forEach((el) => {
    if (el.getBoundingClientRect().top > window.innerHeight * 0.88) {
      el.classList.add('rev-hidden')
    }
    io.observe(el)
  })
}

initSpiral()
initReveal()
initEggs()
