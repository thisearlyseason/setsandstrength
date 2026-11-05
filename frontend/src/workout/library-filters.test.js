import {expect,it} from 'vitest'
import {matchesSelections} from './library-filters.js'
it('uses OR within a group and AND across groups',()=>{
 expect(matchesSelections({eq:'dumbbell',tg:'chest'},{eq:['barbell','dumbbell'],tg:['chest']})).toBe(true)
 expect(matchesSelections({eq:'dumbbell',tg:'back'},{eq:['barbell','dumbbell'],tg:['chest']})).toBe(false)
 expect(matchesSelections({eq:'dumbbell'},{eq:[]})).toBe(true)
})
