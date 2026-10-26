import type { Collection, CollectionName, Database } from "./database";

class MemoryCollection<T extends { readonly id: string }> implements Collection<T> {
  private readonly documents = new Map<string, T>();

  async all() {
    return [...this.documents.values()].map((document) => structuredClone(document));
  }
  async get(id: string) {
    const found = this.documents.get(id);
    return found ? structuredClone(found) : null;
  }
  async put(document: T) {
    this.documents.set(document.id, structuredClone(document));
  }
  async remove(id: string) {
    this.documents.delete(id);
  }
}

/** Process-local database for development and tests. Data is lost on restart. */
export class MemoryDatabase implements Database {
  private readonly collections = new Map<CollectionName, MemoryCollection<{ id: string }>>();
  private readonly counters = new Map<string, number>();

  collection<T extends { readonly id: string }>(name: CollectionName): Collection<T> {
    let collection = this.collections.get(name);
    if (!collection) {
      collection = new MemoryCollection();
      this.collections.set(name, collection);
    }
    return collection as unknown as Collection<T>;
  }

  async nextCounter(name: string, initial: number) {
    const next = (this.counters.get(name) ?? initial) + 1;
    this.counters.set(name, next);
    return next;
  }

  async ensureCounter(name: string, value: number) {
    if (!this.counters.has(name)) this.counters.set(name, value);
  }

  async reset() {
    this.collections.clear();
    this.counters.clear();
  }

  async close() {}
}
