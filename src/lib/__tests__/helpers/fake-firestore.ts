// An in-memory stand-in for the slice of the Admin Firestore API the shop
// uses: documents, equality and range filters, orderBy, limit, count(),
// getAll() and transactions. Transactions are serialised, which is the
// isolation the real one gives the shop's read-then-write blocks; that is
// what lets the tests run two fulfilments concurrently and expect one order.

type Data = Record<string, unknown>;
type Op = '==' | '>=' | '<=' | '>' | '<';

function clone<T>(v: T): T {
  if (v instanceof Date) return new Date(v.getTime()) as T;
  if (Array.isArray(v)) return v.map(clone) as T;
  if (v && typeof v === 'object') {
    const out: Data = {};
    for (const [k, x] of Object.entries(v as Data)) out[k] = clone(x);
    return out as T;
  }
  return v;
}

function cmp(a: unknown, b: unknown): number {
  const av = a instanceof Date ? a.getTime() : (a as number);
  const bv = b instanceof Date ? b.getTime() : (b as number);
  return av < bv ? -1 : av > bv ? 1 : 0;
}

export class FakeFirestore {
  store = new Map<string, Map<string, Data>>();
  private seq = 0;
  private lock: Promise<unknown> = Promise.resolve();

  private col(name: string) {
    let c = this.store.get(name);
    if (!c) this.store.set(name, (c = new Map()));
    return c;
  }

  reset() {
    this.store.clear();
  }

  all(name: string): Array<{ id: string; data: Data }> {
    return [...this.col(name).entries()].map(([id, data]) => ({ id, data: clone(data) }));
  }

  collection(name: string) {
    return new FakeQuery(this, name, []);
  }

  docRef(collection: string, id: string) {
    const db = this;
    const ref = {
      id,
      path: `${collection}/${id}`,
      async get() {
        return db.snapshot(collection, id);
      },
      async set(data: Data) {
        db.col(collection).set(id, clone(data));
      },
      async update(patch: Data) {
        const cur = db.col(collection).get(id);
        if (!cur) throw new Error(`No document to update: ${collection}/${id}`);
        db.col(collection).set(id, { ...cur, ...clone(patch) });
      },
      __collection: collection,
    };
    return ref;
  }

  snapshot(collection: string, id: string) {
    const data = this.col(collection).get(id);
    return {
      id,
      exists: data !== undefined,
      ref: this.docRef(collection, id),
      data: () => (data ? clone(data) : undefined),
    };
  }

  rawSet(collection: string, id: string, data: Data) {
    this.col(collection).set(id, clone(data));
  }

  rawAdd(collection: string, data: Data) {
    const id = `auto${++this.seq}`;
    this.col(collection).set(id, clone(data));
    return id;
  }

  rawDocs(collection: string) {
    return [...this.col(collection).entries()];
  }

  async getAll(...refs: Array<ReturnType<FakeFirestore['docRef']>>) {
    return refs.map((r) => this.snapshot(r.__collection, r.id));
  }

  async runTransaction<T>(fn: (tx: FakeTx) => Promise<T>): Promise<T> {
    const run = async () => {
      const writes: Array<() => void> = [];
      const tx: FakeTx = {
        get: async (ref) => this.snapshot(ref.__collection, ref.id),
        set: (ref, data) => {
          writes.push(() => this.col(ref.__collection).set(ref.id, clone(data)));
        },
        update: (ref, patch) => {
          writes.push(() => {
            const cur = this.col(ref.__collection).get(ref.id);
            if (!cur) throw new Error('No document to update');
            this.col(ref.__collection).set(ref.id, { ...cur, ...clone(patch) });
          });
        },
      };
      const result = await fn(tx);
      for (const w of writes) w();
      return result;
    };
    const next = this.lock.then(run, run);
    this.lock = next.catch(() => {});
    return next;
  }
}

export interface FakeTx {
  get: (ref: ReturnType<FakeFirestore['docRef']>) => Promise<ReturnType<FakeFirestore['snapshot']>>;
  set: (ref: ReturnType<FakeFirestore['docRef']>, data: Data) => void;
  update: (ref: ReturnType<FakeFirestore['docRef']>, patch: Data) => void;
}

class FakeQuery {
  constructor(
    private db: FakeFirestore,
    private name: string,
    private filters: Array<[string, Op, unknown]>,
    private order: [string, 'asc' | 'desc'] | null = null,
    private max: number | null = null,
  ) {}

  doc(id: string) {
    return this.db.docRef(this.name, id);
  }

  async add(data: Data) {
    const id = this.db.rawAdd(this.name, data);
    return this.db.docRef(this.name, id);
  }

  where(field: string, op: Op, value: unknown) {
    return new FakeQuery(this.db, this.name, [...this.filters, [field, op, value]], this.order, this.max);
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
    return new FakeQuery(this.db, this.name, this.filters, [field, dir], this.max);
  }

  limit(n: number) {
    return new FakeQuery(this.db, this.name, this.filters, this.order, n);
  }

  private matches(): Array<[string, Data]> {
    let rows = this.db.rawDocs(this.name).filter(([, d]) =>
      this.filters.every(([f, op, v]) => {
        const x = d[f];
        switch (op) {
          case '==':
            return x === v;
          case '>=':
            return x !== undefined && cmp(x, v) >= 0;
          case '<=':
            return x !== undefined && cmp(x, v) <= 0;
          case '>':
            return x !== undefined && cmp(x, v) > 0;
          case '<':
            return x !== undefined && cmp(x, v) < 0;
        }
      }),
    );
    if (this.order) {
      const [f, dir] = this.order;
      rows = rows.sort((a, b) => cmp(a[1][f], b[1][f]) * (dir === 'desc' ? -1 : 1));
    }
    if (this.max !== null) rows = rows.slice(0, this.max);
    return rows;
  }

  async get() {
    const docs = this.matches().map(([id]) => this.db.snapshot(this.name, id));
    return { empty: docs.length === 0, size: docs.length, docs };
  }

  count() {
    return {
      get: async () => {
        const n = this.matches().length;
        return { data: () => ({ count: n }) };
      },
    };
  }
}
