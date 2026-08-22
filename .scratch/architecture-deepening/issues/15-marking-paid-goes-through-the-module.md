# 15: Marking a Conta paid goes through the module

**What to build:** The last and most involved of the three. Marking an occurrence
paid carries two extra jobs that stay with it — scaling the amount when one
payment covers several parcelas, and clearing the WhatsApp alert log so a Conta
flipped back to unpaid can alert again. Only the materialization moves.

Once this lands, the ADR-0001 inheritance rule exists in exactly one place, and a
fourth mutation gets it right by construction rather than by copying a comment.

**Blocked by:** 13.

**Status:** ready-for-agent

- [ ] Marking a virtual occurrence paid goes through the module
- [ ] A payment covering several parcelas still scales the amount and records the
      coverage
- [ ] Unmarking a prepayment still resets its coverage and amount
- [ ] The paid row still inherits its Categoria from the Conta
- [ ] The WhatsApp alert log is still cleared on unpaid to paid, for both key
      shapes
- [ ] Marking paid in a locked month is still refused
- [ ] The last copy of the ADR-0001 insert comment is gone
