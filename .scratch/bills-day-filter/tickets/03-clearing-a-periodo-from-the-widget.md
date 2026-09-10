# 03: Clearing a Período from the widget

**What to build:** An X on the widget that clears the selection, whether that is
a single day or a span.

Without it, clearing means going back to the calendar and clicking the right day
— and after ticket 02, "the right day" is only obvious when the Período is one
day long. Clearing a span means clicking any day to collapse it to one, then
clicking that same day again. Two clicks and a rule to remember, for the most
ordinary thing a user wants to do next. The X is one click from anywhere.

**Where focus goes.** Clearing unmounts the widget, and the X is inside it, so
the element holding focus disappears — which drops focus to the top of the
document. A mouse user sees nothing; a keyboard user loses their place entirely
and has to travel back down the page.

The earlier grilling met this exact problem and dodged it, putting the clear on
the calendar button, which never unmounts. Bringing the affordance onto the
widget brings the problem back, so handle it here: on clear, move focus to the
calendar day button for the Período's start. That button always exists, it never
unmounts, and it is where the user's attention was when they made the selection.

This is two lines and it is not really an accessibility feature. It is not
losing your place.

**Blocked by:** 02

**Status:** done

- [x] The widget carries an X that clears the Período
- [x] It clears from any state — a one-day Período or a span
- [x] On clear, focus lands on the calendar day button for the Período's start
- [x] The widget disappears on clear, as it does today when a selection is
      cleared from the calendar
- [x] The `sr-only` sentence announces the cleared state rather than falling
      silent, as it already does
- [x] Typecheck and the full test suite pass
