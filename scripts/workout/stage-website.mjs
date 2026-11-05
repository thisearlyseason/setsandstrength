import { cp, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../', import.meta.url))
const out = root + 'work/setsandstrength-site'
await mkdir(out, { recursive: true })
for (const name of ['index.html', 'intent.css', 'appearance.js', 'store-links.js', 'intent-hero-web.webp', 'intent-hero-mobile.webp', 'landing-effects.css', 'landing-effects.js', 'neon-smoke.svg', 'brand']) {
  await cp(root + 'website/' + name, out + '/' + name, { recursive: true })
}
await writeFile(out + '/robots.txt', 'User-agent: *\nAllow: /\nSitemap: https://setsandstrength.app/sitemap.xml\n')
await writeFile(out + '/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://setsandstrength.app/</loc></url></urlset>\n')
await writeFile(out + '/vercel.json', JSON.stringify({
  framework: null, buildCommand: null, installCommand: null,
  headers: [{ source: '/(.*)', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
  ] }]
}, null, 2) + '\n')
console.log(out)
