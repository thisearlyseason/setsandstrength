/* Progressive enhancement: native scrolling, no idle animation loop. */
(() => {
  const root = document.documentElement
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const smoke = document.querySelector('.smoke-stage')
  const hero = document.querySelector('.hero')
  const cards = [...document.querySelectorAll('[data-depth]')]
  const reveals = [...document.querySelectorAll('[data-reveal]')]
  let frame = 0
  let observer
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

  function render() {
    frame = 0
    if (motion.matches || document.hidden) return
    const height = innerHeight
    const span = Math.max(1, document.documentElement.scrollHeight - height)
    const progress = clamp(scrollY / span, 0, 1)
    // Each wisp starts fully beyond an edge, crosses the viewport, then exits.
    smoke.style.setProperty('--smoke-x', `${-150 + progress * 300}vw`)
    smoke.style.setProperty('--smoke-return', `${150 - progress * 300}vw`)
    smoke.style.setProperty('--smoke-turn', `${-14 + progress * 28}deg`)
    smoke.style.opacity = String(Math.sin(progress * Math.PI) * .85)
    const heroProgress = clamp(-hero.getBoundingClientRect().top / height, 0, 1)
    hero.style.setProperty('--hero-shift', `${heroProgress * 70}px`)
    hero.style.setProperty('--hero-scale', String(1 + heroProgress * .045))
    for (const card of cards) {
      const rect = card.getBoundingClientRect()
      if (rect.bottom < -100 || rect.top > height + 100) continue
      const entry = clamp((rect.top - height * .45) / height, -1, 1)
      card.style.setProperty('--depth-rotate', `${entry * -9}deg`)
      card.style.setProperty('--depth-y', `${entry * 24}px`)
    }
  }
  function schedule() {
    if (!frame && !motion.matches && !document.hidden) frame = requestAnimationFrame(render)
  }
  function configure() {
    cancelAnimationFrame(frame)
    frame = 0
    observer?.disconnect()
    root.classList.toggle('motion-enabled', !motion.matches)
    if (motion.matches) {
      reveals.forEach(el => el.classList.add('is-visible'))
      smoke.style.opacity = '0'
      return
    }
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      }, { threshold: .12 })
      reveals.forEach(el => observer.observe(el))
    } else reveals.forEach(el => el.classList.add('is-visible'))
    schedule()
  }
  addEventListener('scroll', schedule, { passive: true })
  addEventListener('resize', schedule, { passive: true })
  addEventListener('pageshow', schedule)
  document.addEventListener('visibilitychange', schedule)
  motion.addEventListener('change', configure)
  configure()
})()
