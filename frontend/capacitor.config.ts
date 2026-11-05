import type { CapacitorConfig } from '@capacitor/cli'
import base from './capacitor.config.json'

// The barcode SDK lacks an arm64 simulator slice. Only explicit simulator builds omit
// that camera plugin. Normal builds retain the complete existing device configuration.
const config: CapacitorConfig = process.env.SETS_STRENGTH_SIMULATOR === '1'
  ? { ...base, ios: { includePlugins: [
    '@aparajita/capacitor-secure-storage', '@capacitor/app', '@capacitor/filesystem',
    '@capacitor/local-notifications', '@capacitor/share', '@capacitor/splash-screen',
  ] } }
  : base
export default config
