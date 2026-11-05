const actions = {
  review_history: 'Review the source sessions below before deciding on your next change.',
  review_schedule: 'Review your schedule and choose a comfortable next session.',
  keep_logging: 'Keep logging your sessions to build a useful comparison baseline.',
}
export function validatedCoachGuidance(output, sessionCount) {
  if (sessionCount < 3) return actions.keep_logging
  const action = String(output || '').trim().replace(/^"|"$/g, '')
  return Object.hasOwn(actions, action) ? actions[action] : null
}
