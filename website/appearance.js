(() => {
  const key = 'workout.appearance'
  const root = document.documentElement
  function apply(mode) {
    root.dataset.theme = mode
    document.querySelector('link[rel="icon"]').href = `brand/seal-${mode}.webp`
    document.querySelector('meta[name="theme-color"]').content =
      mode === 'light' ? '#f6f7f0' : '#090c0a'
  }
  let initial = 'dark'
  try {
    if (localStorage.getItem(key) === 'light') initial = 'light'
  } catch {
    // A storage-restricted browser can still switch for this page visit.
  }
  apply(initial)
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('appearance')
    function updateLabel() {
      const label = root.dataset.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      button.setAttribute('aria-label', label)
      button.title = label
    }
    updateLabel()
    button.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
      apply(next)
      updateLabel()
      try {
        localStorage.setItem(key, next)
      } catch {
        // Keep the active appearance even if the preference cannot be saved.
      }
    })
  })
})()
