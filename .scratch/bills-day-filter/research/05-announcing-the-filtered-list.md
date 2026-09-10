# Research: Announcing the filtered list

Ticket: `.scratch/bills-day-filter/issues/05-announcing-the-filtered-list.md`
Researched: 2026-09-10
Sources: W3C WAI-ARIA 1.2 (normative), ARIA Authoring Practices Guide (APG),
WCAG 2.2 Understanding + Techniques, MDN. No secondary sources were used.

## The short version

There is **no APG pattern for "a control that filters a list elsewhere on the
page."** The answer is assembled from the ARIA spec plus WCAG SC 4.1.3, and one
sentence in Understanding 4.1.3 settles most of it: the filtered *list* is not
what gets announced — a **short status message about the result** is.

1. `aria-pressed` is literally correct for each day button (it is a genuine
   press-and-release two-state toggle) but says nothing about the set being
   mutually exclusive. No primary source covers "one-of-N toggle buttons".
2. Yes to a live region, but on a **brief summary line**, not on the list, not
   on the card. `role="status"` + explicit `aria-atomic="true"`, rendered
   before the first selection ever happens.
3. The empty state is announced by **changing the text of that same region**.
   WCAG names `"No results returned"` as a status message explicitly.
4. No documented pattern for a "clear filter" control. It is a plain APG
   command button; the real constraint the sources do give is about **losing
   focus when the button unmounts**.

---

## Q1 — Does `aria-pressed` mis-describe a filter toggle?

`CalendarStrip.tsx:158` sets `aria-pressed={isHighlighted}` on each day
`<button>`; `MonthlyViewClient.tsx:30-32` toggles the same day back to `null`
on a second click.

### What the spec says

WAI-ARIA 1.2, `aria-pressed`
(https://www.w3.org/TR/wai-aria-1.2/#aria-pressed):

> Indicates the current "pressed" state of toggle buttons. See related
> `aria-checked` and `aria-selected`.
> Toggle buttons require a full press-and-release cycle to change their value.
> Activating it once changes the value to true, and activating it another time
> changes the value back to false. […] If the attribute is not present, the
> button is not a toggle button.

Characteristics: **Used in Roles: `button`**. Value: tristate.

The `handleSelectDay` behaviour is exactly that cycle, so per-button the
attribute is not a lie.

APG Button Pattern (https://www.w3.org/WAI/ARIA/apg/patterns/button/):

> **Important: it is critical the label on a toggle does not change when its
> state changes.** […] Alternatively, if the design were to call for the button
> label to change from "Mute" to "Unmute," the `aria-pressed` attribute would
> not be needed.

The day button's label is the day number, which does not change with state, so
this constraint is satisfied as written.

### Where it under-describes

Only one day can be selected. `aria-pressed` carries **no set semantics** —
nothing tells assistive technology that pressing day 15 un-pressed day 9. The
spec's `mixed` value does not help; it means "the values of more than one item
controlled by the button do not all share the same value", which is about one
button controlling many items, not about many buttons in an exclusive set.

The two spec alternatives do not cleanly fit either:

- **`aria-selected`** — https://www.w3.org/TR/wai-aria-1.2/#aria-selected —
  "Used in Roles: `gridcell` `option` `row` `tab`". A plain `<button>` inside a
  `<div className="grid grid-cols-7">` is none of those, so putting
  `aria-selected` on the current markup is out of spec.
- **`aria-current`** — https://www.w3.org/TR/wai-aria-1.2/#aria-current —
  allowed on "All elements of the base markup", means "the element that
  represents the current item within a container or set of related elements",
  and "Authors SHOULD only mark one element in a set of elements as current",
  which matches single-selection. But: "Authors SHOULD NOT use the
  `aria-current` attribute as a substitute for `aria-selected` in widgets where
  `aria-selected` has the same meaning", and its `date` token is documented as
  "Represents the current date within a collection of dates" / "used to
  indicate the current date within a calendar" — i.e. **today**, not the
  filtered day. `aria-current="date"` here would be ambiguous with the `isToday`
  styling already at `CalendarStrip.tsx:164-166`. Only `aria-current="true"`
  ("the current item within a set") would be literally accurate.

### The APG's only calendar precedent

The Date Picker Dialog example
(https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)
promotes the grid to a real `role="grid"` and marks the chosen date with
`aria-selected="true"` on the `gridcell`, uses a roving `tabindex`, and puts
`aria-live="polite"` on the `h2` that names the displayed month. It also makes
the effect audible **through the accessible name**: "When users select a date,
the accessible name is changed to 'Change Date, DATE_STRING'".

That is a date *input*, not a filter. APG offers no filter analogue.

### Answer

`aria-pressed` does not mis-describe the individual control — it describes it
precisely. It under-describes the *set*, and **no primary source resolves the
one-of-N toggle-button case**. Two in-spec options exist:

- keep `aria-pressed` (correct per button, silent on exclusivity); or
- promote the day grid to `role="grid"` / `gridcell` and use `aria-selected`,
  as the APG date picker does — a much larger change (roving tabindex, arrow-key
  navigation) that the ticket's destination does not obviously earn.

Either way, **no ARIA state on the button can announce what happened in a card
three rows down**. That is what Q2 is for.

---

## Q2 — Does the Contas card need a live region, and on what element?

### It is in scope for SC 4.1.3 (Level AA)

Selecting a day does not move focus and does not reload. Understanding 3.2.2 On
Input (https://www.w3.org/WAI/WCAG22/Understanding/on-input.html):

> A change of content is not always a change of context. Changes in content,
> such as an expanding outline, dynamic menu, or a tab control do not
> necessarily change the context, unless they also change one of the above
> (e.g., focus).

So it is not exempted from SC 4.1.3 as a change of context.

### The sentence that decides the shape

Understanding SC 4.1.3 Status Messages
(https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), Intent:

> Information can be added to pages which does not meet the definition of a
> status message. For example, **the list of results obtained from a search are
> not considered a status update** and thus are not covered by this success
> criterion. However, **brief text messages displayed about the completion or
> status of the search, such as "Searching…", "18 results returned" or "No
> results returned" would be status updates** if they do not take focus or cause
> a page refresh.

So: **not** the `<ul>` at `BillsSection.tsx:54`, **not** the `<Card>` at
`BillsSection.tsx:97`, **not** `<h2>Contas</h2>`. A short summary line.

Understanding 4.1.3 also warns against the "wrap the whole card" instinct:

> Live regions and alerts can be usefully applied in many situations where a
> change of content takes place which does not constitute a status message […]
> However, **there is a risk of making an application too "chatty"** for a
> screen reader user.

### The mechanism

Sufficient technique for Situation A ("If a status message advises on the
success or results of an action, or the state of an application") is
**ARIA22 + G199**. ARIA22: Using `role=status` to present status messages
(https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22):

> This is done by adding `role="status"` to the element that contains the status
> message. The aria live region role of `status` has an implicit `aria-live`
> value of `polite` […] The role of `status` also has a default `aria-atomic`
> value of `true` […]
> Note that since `role="status"` is currently not treated as atomic by default
> in some environments, it is advisable to **add an explicit
> `aria-atomic="true"`**.

Its Example 1 is exactly this case:

```html
<div role="status" aria-atomic="true">5 results returned.</div>
```

MDN, `status` role
(https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role)
confirms the implicit `aria-live="polite"` and `aria-atomic="true"`, that
`status` is for "advisory information […] not important enough to be an
`alert`", and adds:

> **Do not give focus to the status when its content updates.**

So: `role="status"`, polite, never `role="alert"` (nothing here is urgent), and
focus stays on the day button — which matches the APG button guidance that
"focus typically remains on the button after activation, e.g., an Apply or
Recalculate button".

### It must exist before the first selection

ARIA22 test procedure:

> Check that the container destined to hold the status message **has a role
> attribute with a value of `status` before the status message occurs**.

MDN, ARIA live regions
(https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions):

> Assistive technologies will generally only announce _dynamic_ changes in the
> content of a live region. Including an `aria-live` attribute […] works as long
> as you add the attribute **before the changes occur** […]
> Start with an empty live region, then – in a separate step – change the
> content inside the region.

**Concretely for `BillsSection.tsx`:** the status element must be rendered on
every path, including the unfiltered month view and the `isEmpty` branch. It
cannot live inside the `isEmpty ? … : …` ternary at
`BillsSection.tsx:103-134`, and it cannot be conditionally mounted on
`highlightedDay !== null` — mounting it at the same moment its text appears is
the classic way to get silence.

### Count vs. whole list vs. hidden line

Understanding 4.1.3, "Modification of status text":

> If a status message persists on the page, modifications to this text are
> usually equivalent to a new status message. […] where only the number in this
> string was coded as an updated chunk of content, the resulting experience for
> screen reader users could be to only hear "three" […] In such situations,
> **marking the entire "3 items" string as the status text would normally be a
> better solution**.

This is directly relevant to `BillsSection.tsx:98-101`, where the label
(`<h2>Contas</h2>`) and the figure (`<p>{brlFormatter.format(bills.total)}</p>`)
are separate elements: a live region around the figure alone would announce a
bare currency amount. The region should contain a complete sentence, with
`aria-atomic="true"` so the whole of it is re-read.

On whether the line should be visible or visually hidden, Understanding 4.1.3
permits both and leans toward visible:

> This success criterion was intentionally worded to apply primarily when
> **visible text is added to (or becomes visible on) the page**. The reason for
> this is that where new text is displayed, it is intended to be visible to all
> users.

and, for the hidden case:

> There may be cases where the addition of visible text does not by itself
> convey sufficient information to the user of assistive technology. For
> example, **the proximity of new content to other pieces of information on the
> screen may provide a visual context that is lacking in the text alone.** In
> such cases, authors may wish to designate additional content for inclusion in
> the status message, including non-displayed text […] for added context.

That second paragraph describes this ticket's situation exactly: a sighted user
gets the context from seeing the message inside the Contas card; a screen reader
user hearing a bare "3 obrigações" does not know which card it came from.

**Recommended shape**, given map decision 7 already commits the card to a
visible "filter is active" affordance: put `role="status" aria-atomic="true"` on
that **visible** affordance element in `BillsSection`, and, if its visible
wording omits the card, add a visually hidden `<span>` inside the same container
carrying the missing context. Tailwind v4 is in use (`globals.css:1`,
`@import "tailwindcss"`), so the built-in `sr-only` utility is available; the
repo currently has no `sr-only` usage and no visually-hidden helper anywhere in
`src/`.

### One nuance worth stating plainly

Understanding 4.1.3 closes with:

> **The purpose of this success criterion is not to force authors to generate
> new status messages.** Its intent is to ensure that when status messages are
> displayed, they are programmatically identified in a way that allows
> assistive technologies to present them to the user.

So SC 4.1.3 does not, on its own, oblige the app to invent a message. It bites
the moment the card shows a visible filter indicator — which map decision 7
already settles. Without such visible text there would be a real usability gap
but no conformance failure to point at.

---

## Q3 — How should the empty state be announced?

Answered directly by Understanding 4.1.3, quoted above: `"No results returned"`
is listed alongside `"18 results returned"` as a status update. The empty result
is a status message, not an absence of one.

Two consequences for `BillsSection.tsx`:

1. **The empty day must produce text, not a removed element.** Understanding
   4.1.3, "Removal of status text":

   > In situations where status text is entirely removed, its absence may itself
   > convey information about the status. […] However non-sighted users would be
   > unaware of this change […] Where updating the visible message (e.g., to
   > "system available") is not feasible, the use of a non-visible status
   > message, such as "system available", ensures equivalent status information
   > is provided.

   So the region's text must be **swapped**, never emptied — including when the
   filter is cleared and the card returns to the month view.

2. **The existing empty branch is not the same thing.** The `<p>` at
   `BillsSection.tsx:104-110` renders only when the whole month has no
   obrigações (`isEmpty`, line 94). A day-scoped empty state is a *change of
   text inside a persisting region*, which is what makes it audible. If the
   day-empty message is rendered as a freshly mounted `<p>` outside the status
   region, it will be silent for the same reason as any late-mounted live
   region.

Because `role="status"` is atomic, one sentence covering both the count and the
day is what gets read — which is what the "Modification of status text" guidance
above asks for.

---

## Q4 — Is there a documented pattern for the "clear filter" control?

**No.** This is a genuine gap, stated rather than papered over.

- The APG pattern index (https://www.w3.org/WAI/ARIA/apg/patterns/) lists 30
  patterns: Accordion, Alert, Alert and Message Dialogs, Breadcrumb, Button,
  Carousel, Checkbox, Combobox, Dialog (Modal), Disclosure, Feed, Grid,
  Landmarks, Link, Listbox, Menu and Menubar, Menu Button, Meter, Radio Group,
  Slider, Slider (Multi-Thumb), Spinbutton, Switch, Table, Tabs, Toolbar,
  Tooltip, Tree View, Treegrid, Window Splitter. **No Filter, Faceted Search,
  Chip, Tag or Clear pattern.**
- The APG practices index (https://www.w3.org/WAI/ARIA/apg/practices/) lists
  seven practices — Landmark Regions, Providing Accessible Names and
  Descriptions, Developing a Keyboard Interface, Grid and Table Properties,
  Communicating Value and Limits for Range Widgets, Structural Roles, Hiding
  Semantics with the `presentation` Role. **None covers filtering or status
  announcements.**

What the primary sources *do* constrain:

**It is an ordinary command button, not a toggle.** APG Button Pattern
(https://www.w3.org/WAI/ARIA/apg/patterns/button/): Space and Enter activate it,
and

> If activating the button does not dismiss the current context, then focus
> typically remains on the button after activation, e.g., an Apply or Recalculate
> button.

A clear-filter control is one-shot, so it must **not** carry `aria-pressed` —
per the spec, "If the attribute is not present, the button is not a toggle
button", which is the correct exposure here.

**Focus is the trap.** A clear-filter button has nothing to clear once used, so
the obvious implementation unmounts it — destroying focus. APG, Developing a
Keyboard Interface
(https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/):

> if the user closes a dialog or performs a destructive operation like deleting
> an item from a list, the active element may be hidden or removed from the DOM.
> If such events are not managed to set focus on the button that triggered the
> dialog or on the list item following the deleted item, **browsers move focus to
> the body element, effectively causing a loss of focus within the user
> interface.**

So either keep the control mounted across both states, or move focus
deliberately (e.g. back to the day button in `CalendarStrip`) when it unmounts.
This is the sharpest constraint the sources give on the clear control and the
one most likely to be missed.

**Naming.** APG, Providing Accessible Names and Descriptions
(https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/):

> Create unique names for elements with the same role unless the elements are
> actually identical.

and it advises putting the distinguishing verb first. A bare "Limpar" would
collide with any other clear/remove control on the page; "Limpar filtro de dia"
(or similar) is what the practice asks for. The same page prefers a visible text
label over an icon-only control: "If an interactive element, such as an input
field or button, does not have a visually persistent text label, consider
adjusting the design to include one."

**`aria-controls` is allowed but unproven.** WAI-ARIA 1.2
(https://www.w3.org/TR/wai-aria-1.2/#aria-controls):

> Identifies the element (or elements) whose contents or presence are controlled
> by the current element.

Permitted on all elements, so pointing the day buttons (and/or the clear button)
at the Contas card is in spec. But no APG pattern outside composite widgets
requires it, no sufficient technique for SC 4.1.3 uses it, and **no primary
source makes any claim about whether assistive technology surfaces it.** Treat
it as optional metadata, not as the announcement mechanism.

---

## Adjacent finding: the calendar's dot labels are invalid ARIA

Not in the ticket's four questions, but it directly affects what a screen reader
user hears when they press a day.

`CalendarStrip.tsx:174-192` puts `aria-label` on bare `<span>` elements:

```tsx
<span className="h-1 w-1 rounded-full …" aria-label={hasOverdue ? "Tem contas vencidas em aberto" : "Tem contas ou despesas"} />
```

WAI-ARIA 1.2, `generic` role (https://www.w3.org/TR/wai-aria-1.2/#generic) —
the implicit role of HTML `div` and `span`:

> **Prohibited States and Properties: `aria-label`, `aria-labelledby`,
> `aria-roledescription`** […] Name From: **prohibited**

So those labels are not reliably exposed, and each day button's accessible name
is just the number — `"15, toggle button, pressed"`. Whether a day has
obrigações, and which month it belongs to, are both inaudible.

The fix in spec terms is to move the text into a visually hidden `<span>` that
becomes part of the **button's** accessible name (content contributes to a
button's name; `aria-label` on a `span` does not). The APG date picker precedent
for making a control's consequence audible is exactly this — it changes the
trigger's accessible name to "Change Date, DATE_STRING"
(https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/).
Giving each day button a name like "15 de setembro, 3 obrigações" would make the
pressed announcement intelligible without needing to have seen the column header.

---

## Where the sources are silent

Stated explicitly, because a false consensus here would be worse than a gap.

1. **No APG pattern for filtering.** Neither the 30 patterns nor the 7 practices
   cover a control that filters content elsewhere on the page, a filter chip, or
   a clear-filter control. Everything above is assembled from the normative ARIA
   spec and WCAG, not lifted from a ready-made widget.
2. **No guidance on a mutually-exclusive set of `aria-pressed` buttons.**
   `aria-pressed` is defined per button; `aria-selected` is restricted to
   `gridcell`/`option`/`row`/`tab`; `aria-current` warns against substituting for
   `aria-selected` and reserves its `date` token for the current date in a
   calendar. The set semantics of "day 15 pressed, therefore day 9 released" are
   genuinely undefined by primary sources.
3. **No ruling on visible vs. visually hidden status text.** Understanding 4.1.3
   permits both, prefers that visible text carry the status, and allows
   non-displayed text for context the visible words lack. Which one this card
   uses is a design decision, not a spec one.
4. **No primary-source claim about `aria-controls` support.** The spec defines
   it; nothing normative or in the APG says whether it helps a screen reader user
   find the Contas card.
5. **No guidance on distance.** Nothing in APG, WCAG or MDN treats "the control
   and its effect are far apart / off-screen on mobile" as a distinct case with
   its own requirements. The `role="status"` mechanism is the same whether the
   card is adjacent or three rows down; the distance only raises the value of
   naming the card inside the message (Understanding 4.1.3's "proximity […]
   provides a visual context that is lacking in the text alone").
6. **MDN's live-regions guide has no section on filtering or search results.**
   Its examples are a planet selector and a roster. The search-results framing
   comes from WCAG (Understanding 4.1.3 and ARIA22), not MDN.

## Sources

- WAI-ARIA 1.2 (W3C Recommendation) — https://www.w3.org/TR/wai-aria-1.2/
  (`#aria-pressed`, `#aria-selected`, `#aria-current`, `#aria-controls`,
  `#generic`)
- APG Button Pattern — https://www.w3.org/WAI/ARIA/apg/patterns/button/
- APG Pattern index — https://www.w3.org/WAI/ARIA/apg/patterns/
- APG Practices index — https://www.w3.org/WAI/ARIA/apg/practices/
- APG Providing Accessible Names and Descriptions —
  https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/
- APG Developing a Keyboard Interface —
  https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
- APG Date Picker Dialog Example —
  https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/
- Understanding SC 4.1.3 Status Messages —
  https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- Understanding SC 3.2.2 On Input —
  https://www.w3.org/WAI/WCAG22/Understanding/on-input.html
- Technique ARIA22: Using role=status to present status messages —
  https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22
- MDN, ARIA live regions —
  https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions
- MDN, ARIA status role —
  https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role
- MDN, aria-current —
  https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current
