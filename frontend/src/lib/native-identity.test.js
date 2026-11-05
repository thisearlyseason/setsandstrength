import { readFileSync } from 'node:fs'
import { it, expect } from 'vitest'
import { isOwnRecord } from './health-read.js'
it('uses the approved new iOS identity across signing and App Groups',()=>{
 const root=new URL('../../',import.meta.url)
 const read=p=>readFileSync(new URL(p,root),'utf8')
 expect(read('ios/App/App.xcodeproj/project.pbxproj')).toContain('PRODUCT_BUNDLE_IDENTIFIER = pro.gamedaysports.setsstrength;')
 for(const p of ['App/App.entitlements','App/Info.plist','Watch/OpenGymWatch.entitlements','OpenGymWidgets/OpenGymWidgets.entitlements','WatchWidgets/OpenGymWatchWidgets.entitlements','AnimationPacksDownloader/AnimationPacksDownloader.entitlements']) expect(read('ios/App/'+p)).toContain('group.pro.gamedaysports.setsstrength')
 expect(read('ios/ci/add-ui-tests.rb')).toContain('pro.gamedaysports.setsstrength.uitests')
})
it('recognizes both historical and new native health origins to avoid importing its own records',()=>{
 expect(isOwnRecord({origin:'pro.gamedaysports.setsstrength'})).toBe(true)
 expect(isOwnRecord({origin:'pro.gamedaysports.setsstrength.watchkitapp'})).toBe(true)
 expect(isOwnRecord({origin:'ch.duartesantos.opengym'})).toBe(true)
 expect(isOwnRecord({origin:'pro.gamedaysports.setsstrengthx'})).toBe(false)
})
it('uses the matching new Android application and Capacitor identity',()=>{
 const root=new URL('../../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8')
 expect(read('android/app/build.gradle')).toContain('applicationId "pro.gamedaysports.setsstrength"')
 expect(JSON.parse(read('capacitor.config.json')).appId).toBe('pro.gamedaysports.setsstrength')
 expect(read('android/app/src/main/res/values/strings.xml')).toContain('<string name="custom_url_scheme">pro.gamedaysports.setsstrength</string>')
})
