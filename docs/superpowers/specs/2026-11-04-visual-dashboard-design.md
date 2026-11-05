# Visual dashboard and workout creation
User requests a visually engaging app-wide treatment, meaningful colored charts, custom workouts/plans from the log, and a profile-selected male/female Body figure with colored smoke linked to measurements.

Implement native SVG rings and trend graphics, open section layouts, consistent semantic accents (lime goal progress, cyan activity, violet trends), responsive spacing and light/dark support. Avoid arbitrary percentage gauges for quantities without a denominator. Existing calculations remain the data source. Empty states say what is missing.

Body: selectable regions on a shaded SVG male/female figure, soft smoke overlays, latest values and changes with a legend and textual equivalents. Default proposal: cyan increase, violet decrease, neutral unchanged/no prior reading, without labeling either healthy/unhealthy. Use S.body and expose preference in Profile. Do not infer body shape from weight or resize the figure based on measurements. Reduce motion for accessibility.

Creation: manual composer supports a reusable individual workout, a multi-session custom plan, and a completed session logged on a selected past/today date. Catalog exercise selection, editable sets/reps/load or timed/cardio fields, and explicit save actions. Plans do not become completed workouts; retroactive logging leaves active sessions intact. Reuse state schema and completed-session construction.

Approaches: decorative charts alone fail the user's desire to see status; selected design ties visuals to real data. Heavy 3D rendering adds load without improving measurement interpretation, so use lightweight SVG/CSS.

User's existing authorization to implement the recommendation remains in force; proceed with independent work while optional color preference is pending. No publishing, dependency installs, or unrelated cleanup.
