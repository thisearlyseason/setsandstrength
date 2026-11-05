// Additional self-directed adult tracks. Entries with a duration are logged in seconds.
const types = [
  [
    'bodyweight',
    'Bodyweight',
    'Strength without a rack',
    'Floor and standing strength with no equipment',
    [
      ['Lower-body control', '3948', '3561', '1241'],
      ['Push & brace', '0662', '0276', '0133:20'],
      ['Full-body practice', '3948', '0662', '1241'],
    ],
  ],
  [
    'dumbbells',
    'Dumbbell strength',
    'The two-dumbbell plan',
    'Squat, press and lunge with free weights',
    [
      ['Squat & press', '1760', '0405', '0276'],
      ['Lunge & pull', '0336', '0293', '1241'],
      ['Full-body strength', '1760', '0293', '0405'],
    ],
  ],
  [
    'mobility',
    'Mobility',
    'Room to move',
    'Unhurried practice for hips, spine and shoulders',
    [
      ['Hip mobility', '6560:25', '0945:30', '1241'],
      ['Spine & shoulders', '3408', '1051', '1777:20'],
      ['Full range flow', '6560:25', '3408', '0945:30'],
    ],
  ],
  [
    'core',
    'Core & stability',
    'Steady at the center',
    'Mat-based trunk control and balance',
    [
      ['Floor foundations', '0276', '1241', '0133:20'],
      ['Side-to-side stability', '0133:20', '3561', '1241'],
      ['Controlled transitions', '3496', '0276', '3561'],
    ],
  ],
  [
    'cardio',
    'Low-impact cardio',
    'Build your engine',
    'Walking and stationary cycling at a repeatable pace',
    [
      ['Walking intervals', '2258:180', '2258:90'],
      ['Bike intervals', '0798:180', '0798:90'],
      ['Steady endurance', '2258:300', '0798:180'],
    ],
  ],
  [
    'bands',
    'Resistance bands',
    'Strength on the go',
    'Portable pulling, hinging and lateral movement',
    [
      ['Back & shoulders', '1503', '3511', '1241'],
      ['Hip strength', '6607', '0991', '3561'],
      ['Full-body band circuit', '6607', '1503', '3511'],
    ],
  ],
]
function exercise(spec, sets, level, week) {
  const [id, sec] = spec.split(':')
  return {
    id,
    sets,
    mode: sec ? 'time' : 'reps',
    reps: sec ? 0 : 6 + 2 * level,
    sec: sec ? Number(sec) + (week === 2 ? 5 : 0) : 0,
    weight: 0,
    rest: 60,
  }
}
export const activityPrograms = types.flatMap(
  ([sport, label, title, focus, sessions]) =>
    ['beginner', 'intermediate', 'advanced'].map((track, i) => ({
      id: sport + '-' + track,
      version: 1,
      sport,
      label,
      title,
      focus,
      track,
      level: track[0].toUpperCase() + track.slice(1),
      ageBand: 'adult',
      reviewStatus: 'draft',
      duration: 4,
      supervision: 'Self-directed adult training',
      description: focus,
      weeks: Array.from({ length: 4 }, (_, w) => ({
        week: w + 1,
        note: [
          'Learn the session and record a comfortable baseline.',
          'Repeat the pattern with consistent technique.',
          'Compare with week one; adjust only if comfortable.',
          'Use a lighter week to review your progress.',
        ][w],
        sessions: sessions.map(([name, ...moves], day) => ({
          name,
          offset: w * 7 + day * 2,
          sections: [
            {
              name: 'Warm-up',
              exercises: [
                exercise('2258:90', 1, 0, 0),
                exercise('3408', 1, 0, 0),
              ],
            },
            {
              name: 'Main',
              exercises: moves.map((m) =>
                exercise(m, w === 3 ? 1 : 1 + i, i, w),
              ),
            },
            { name: 'Cooldown', exercises: [exercise('0945:30', 1, 0, 0)] },
          ],
        })),
      })),
    })),
)
