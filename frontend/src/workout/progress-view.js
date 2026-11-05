const views = new Set(['overview', 'history', 'body', 'insights'])
export function progressView(search, hash) {
  if (hash.startsWith('#workout-')) return 'history'
  const view = new URLSearchParams(search).get('view')
  return views.has(view) ? view : 'overview'
}
