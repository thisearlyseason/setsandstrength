// Conservative browsing tags; unclassified is explicit rather than guessing difficulty.
export const difficultyOf = (ex) =>
  ({
    3948: 'beginner',
    2258: 'beginner',
    '0276': 'beginner',
    1241: 'beginner',
    1051: 'beginner',
    3408: 'beginner',
    '0701': 'beginner',
    '0662': 'intermediate',
    '0032': 'intermediate',
    '0027': 'intermediate',
    '0336': 'intermediate',
    '0514': 'intermediate',
    '0997': 'beginner',
    '0894': 'beginner',
    6607: 'beginner',
  })[ex.id] || 'unclassified'
export const movementOf = (ex) => {
  const n = ex.n.toLowerCase()
  if (/deadlift|good morning|hip hinge/.test(n)) return 'hinge'
  if (/squat/.test(n)) return 'squat'
  if (/lunge|split squat|step.up/.test(n)) return 'unilateral'
  if (/press|push.up/.test(n)) return 'press'
  if (/row|pull.up|pulldown|chin.up/.test(n)) return 'pull'
  if (/walk|running|\brun\b|sprint/.test(n)) return 'locomotion'
  if (/plank|dead bug|bird dog|crunch/.test(n)) return 'floor'
  return 'unclassified'
}
