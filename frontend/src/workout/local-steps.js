// Device health facts are returned to this screen only: never added to profile sync or telemetry.
export function localDayWindow(now = Date.now()) {
  const start = new Date(now); start.setHours(0,0,0,0)
  return { from: start.getTime(), to: now }
}
export async function nativeStepAdapter() {
  const { Capacitor, registerPlugin } = await import('@capacitor/core')
  const platform = Capacitor.getPlatform()
  return ['ios','android'].includes(platform) ? { HC: registerPlugin(platform === 'ios' ? 'AppleHealth' : 'HealthConnect'), platform } : null
}
export async function readLocalSteps({ adapter, enabled = false, request = false, now = Date.now() } = {}) {
  if (!enabled) return {state:'disconnected',count:null}
  if (!adapter) return {state:'unsupported',count:null}
  const {HC,platform}=adapter
  try {
    let status=await HC.status()
    if (status.status !== 'available') return {state:status.status || 'unsupported',count:null}
    if (request) { await HC.requestPermissions({read:['steps'],write:[]}); status=await HC.status() }
    // HealthKit deliberately does not expose read authorization. No returned samples is unknown.
    if (platform === 'android' && !status.read?.steps) return {state:'permission',count:null}
    const range=localDayWindow(now), result=await HC.readSteps(range)
    const count=result.count
    return {state:count != null && Number.isInteger(count) && count >= 0 ? 'ready':'no-data',count:count != null && Number.isInteger(count) && count >= 0 ? count:null,at:now,...range,source:platform === 'ios'?'Apple Health':'Health Connect'}
  } catch(error) { return {state:error?.code === 'permission'?'permission':'unavailable',count:null} }
}
