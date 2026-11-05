// Push/pull are upper-body training groups, not literal words in an exercise name.
export function trainingGroup(exercise) {
 if (['stretching','mobility','cardio','yoga','pilates'].includes(exercise.cat)) return ''
 const muscle=String(exercise.tg||'').toLowerCase()
 if (/lat|back|rhomboid|bicep|brachialis|forearm/.test(muscle)) return 'pull'
 if (/pectoral|chest|delt|shoulder|tricep/.test(muscle)) return 'push'
 return ''
}
export function matchesExerciseSearch(exercise, query='') {
 const haystack=`${exercise.n} ${exercise.tg} ${exercise.bp} ${exercise.eq}`.toLowerCase()
 return query.toLowerCase().trim().split(/\s+/).filter(Boolean).every(word=>
  ['push','pull'].includes(word) ? trainingGroup(exercise)===word : haystack.includes(word))
}
