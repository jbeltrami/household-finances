# 04: Configurações controls the Aviso

**What to build:** Avisos are on by default and there is currently no way to turn
them off, no way to tell whether they are working, and no way to see what one
looks like without waiting for a bill to fall due.

Give Configurações a switch for Avisos that is independent of the monthly report,
show when the last one went out, and offer a button that sends a real Aviso built
from the space's current data. When nothing is Vencida the test should say so
rather than invent a row — an honest empty result tells the user more about
whether the feature works than a fabricated one does.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] Avisos can be switched off and back on without affecting the monthly report
- [ ] The switch reflects the default-on behaviour for a space that has never
      touched it
- [ ] The date of the last Aviso is visible, and its absence is distinguishable
      from never having sent one
- [ ] A test button sends a real Aviso to the signed-in owner from current data
- [ ] With nothing Vencida, the test reports that plainly and sends nothing
- [ ] Failures surface inline rather than through an error boundary
- [ ] A user can only ever trigger a test for their own space
