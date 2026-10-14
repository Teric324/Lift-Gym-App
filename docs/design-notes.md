# Notes for the design pass

Functionality comes first; a separate pass on look and feel comes after. Collect things here that
the design pass must handle, so they are not lost. The structure is ready for it: tokens in
`src/app/theme.css`, the shell in `src/app/layout.css`, components in `src/ui/ui.css` and
`src/features/session/session.css`. Components use semantic class names, no inline styles.

## From testing on the iPhone

- **Weight picker, landscape with the keyboard open** (step 9): the dialog shows only the title,
  Done and part of the typing field. The error message, the jump buttons and the list are not
  visible. On a short screen, hide the jump buttons and the list while the keyboard is open (and
  keep the typing field, its message and Done).
- **Set row on a narrow phone** (iPhone SE and similar): the row may wrap onto two lines. Review
  the layout of weight, reps (− and +), the check square and the remove button.

## Open design questions

- The weight picker and the exercise pickers are centred dialogs; a bottom sheet may feel more
  natural on a phone. The logic does not depend on it (the dialog sizing follows
  `window.visualViewport`, see `WeightPicker.tsx`).
- The top bar is always dark so the white iOS status bar text is readable; the page itself follows
  the system light or dark mode. Decide whether the whole app should be dark.
- Reordering uses ↑ ↓ buttons (routine editor and session). Drag and drop could replace them.
- The placeholder icon (a barbell, `scripts/generate-icons.mjs`) is not a final design.
