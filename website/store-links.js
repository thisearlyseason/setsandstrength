// Add this product's public listings when they are released. Never use upstream app IDs.
const listings = {
  apple: '',
  google: '',
}
const stores = [
  ['apple', 'apple-store', 'apps.apple.com', 'DOWNLOAD ON THE'],
  ['google', 'google-store', 'play.google.com', 'GET IT ON'],
]
let live = 0
for (const [key, id, host, label] of stores) {
  if (!listings[key]) continue
  try {
    const url = new URL(listings[key])
    if (url.protocol !== 'https:' || url.hostname !== host) continue
    const link = document.getElementById(id)
    link.href = url.href
    link.removeAttribute('aria-disabled')
    link.querySelector('small').textContent = label
    live++
  } catch { /* Keep the honest coming-soon state for an invalid listing. */ }
}
if (live) document.getElementById('availability').textContent = live === 2 ? 'Choose your store to download Sets & Strength.' : 'More platforms coming soon.'
document.getElementById('year').textContent = new Date().getFullYear()
