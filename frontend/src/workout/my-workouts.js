export const myWorkouts = routines => routines.filter(r => !r.programId && !r.cancelledAt && r.inMyWorkouts !== false)
export function deleteMyWorkout(state, id) {
 const routine = state.routines.find(r => r.id === id)
 if (!routine || routine.programId) throw Error('This workout is no longer available.')
 state.routines = state.routines.filter(r => r.id !== id)
 for (const date of Object.keys(state.dayPlan || {})) state.dayPlan[date] = state.dayPlan[date].filter(value => value !== id)
 // Completed history and the independent running-session snapshot are preserved.
}
