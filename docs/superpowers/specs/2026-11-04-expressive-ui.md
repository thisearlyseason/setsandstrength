# Expressive UI and flexible training

Requested in chat: flowing body smoke like the main artwork, strongly highlighted selected anatomy, photo cards and restrained animation, free-written exercise details alongside catalog selection, edit/cancel saved plans, and multi-select library filters.

Implementation: reuse the existing brand photograph in page-specific editorial cards; layered animated SVG ribbons and selected muscle fills; short monthly comparison displays; per-category checkbox filters with OR inside each category and AND between categories. Honor reduced motion.

Training: custom exercises are staged in the composer and saved atomically with notes, reusable across draft plan days. Saved routine/session edits preserve completed workouts. Cancellation archives templates and removes present/future scheduling while retaining history and active workouts, with restoration available. Stable program coordinates preserve renamed-session lookup. Cancelled plans no longer contribute unscheduled-template estimates.

Validation: unit/integration tests cover filters, notes, custom persistence, plan edit/cancel/restore, and renamed-session lookup. Browser checks cover phone/desktop layouts, filter interactions, strong anatomy selection, and photography. Production web build required. No deployment or native release.
