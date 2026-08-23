# 03: The daily Aviso email

**What to build:** Every morning, anyone with an Obrigação Vencida gets an email
naming each one — Contas and parcelas de Financiamento alike — with its due date
and amount, the total, and a way through to that month in the app.

The Aviso keeps no memory of what it has already said. Each run reads what is
Vencida right now and sends if the list is non-empty, so an unpaid Obrigação is
mailed about every day until it is paid or the month rolls over. See
`docs/adr/0002-avisos-are-stateless-and-repeat-daily.md` for why, and resist the
urge to add deduplication.

Recipients come from the space owner's account, so there is nothing for the user
to configure but the switch. Spaces that have turned Avisos off are skipped, and
only the current month is in scope — past months are locked, so an Obrigação in
one is not something the user can act on.

**Blocked by:** 01, 02.

**Status:** done

- [x] A daily run at 08:00 São Paulo emails every opted-in space that has
      something Vencida
- [x] The email names each Obrigação with its due date and amount, shows the
      total, and links to the month
- [x] Parcelas are identified by their Financiamento and parcela number
- [x] The subject states how many are Vencidas
- [x] Spaces with nothing Vencida, and spaces that opted out, receive nothing
- [x] Only the current month is considered
- [x] Nothing is stored that the send decision reads; the run is reproducible from
      the month's data alone
- [x] The last-Aviso timestamp is written only after a send succeeds, so a failed
      send retries the next day
- [x] A failure for one space does not stop the others, and the run reports what
      it sent, skipped and failed
- [x] The endpoint refuses unauthorized callers
- [x] README's stack table and cron schedule describe the daily Aviso
- [x] The code that writes the last-Aviso timestamp says in a comment that it is
      a receipt, and points at ADR-0002 for why nothing may read it to decide
      whether to send
