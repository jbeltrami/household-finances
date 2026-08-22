// A stand-in for the Supabase client, covering only the query shapes the
// occurrence writer actually uses: a filtered read that returns one row, an
// insert, and a filtered update.
//
// It exists because the invariant worth protecting in `writeOccurrence` —
// that the row it creates leaves `category_id` unset so the occurrence
// inherits its Categoria from the Conta (ADR-0001) — cannot be asserted any
// other way without a database. Reading the code is not the same as watching
// the row get built.
//
// Deliberately dumb: `eq` records filters and the seeded table decides what
// comes back. It is not a Postgres. Anything needing real query semantics
// wants a real database, not more of this.

type Row = Record<string, unknown>;

export type FakeDb = {
  // What each table holds. A single row (or null) is what `.maybeSingle()`
  // and `.single()` hand back; an array is what awaiting the query directly
  // hands back as `data`.
  rows: Record<string, Row | Row[] | null>;
};

export type Recorded = {
  inserts: { table: string; values: Row }[];
  updates: { table: string; values: Row; filters: Row }[];
};

class Query implements PromiseLike<{ data: Row | Row[] | null; error: null }> {
  constructor(
    private table: string,
    private db: FakeDb,
    private recorded: Recorded,
    private filters: Row = {}
  ) {}

  select() {
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters[column] = value;
    return this;
  }
  private one(): Row | null {
    const held = this.db.rows[this.table];
    if (Array.isArray(held)) return held[0] ?? null;
    return held ?? null;
  }
  async maybeSingle() {
    return { data: this.one(), error: null };
  }
  async single() {
    return { data: this.one(), error: null };
  }
  insert(values: Row) {
    this.recorded.inserts.push({ table: this.table, values });
    return this;
  }
  update(values: Row) {
    this.recorded.updates.push({
      table: this.table,
      values,
      filters: this.filters,
    });
    return this;
  }
  // An un-awaited terminal call (insert/update without .select()) resolves
  // to the same shape PostgREST gives back.
  then<R1, R2>(
    onFulfilled?:
      | ((v: { data: Row | Row[] | null; error: null }) => R1 | PromiseLike<R1>)
      | null,
    onRejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    const held = this.db.rows[this.table];
    const data = Array.isArray(held) ? held : null;
    return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected);
  }
}

export function fakeSupabase(rows: Record<string, Row | Row[] | null>) {
  const db: FakeDb = { rows };
  const recorded: Recorded = { inserts: [], updates: [] };
  const client = {
    from(table: string) {
      // A fresh Query per `from`, so filters don't leak between statements.
      return new Query(table, db, recorded, {});
    },
  };
  // The real client carries far more surface than `writeOccurrence` touches;
  // the cast keeps the fake honest about covering only that slice.
  return { client: client as never, recorded, db };
}
