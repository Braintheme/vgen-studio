import { RegistryError } from '../errors.js';

/** Minimal id-keyed registry; insertion order is preserved for listing. */
export class Registry<T extends { readonly id: string }> {
  private readonly items = new Map<string, T>();

  constructor(private readonly kind: string) {}

  register(item: T): this {
    if (this.items.has(item.id)) {
      throw new RegistryError('DUPLICATE_ID', `${this.kind} "${item.id}" is already registered`);
    }
    this.items.set(item.id, item);
    return this;
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  find(id: string): T | undefined {
    return this.items.get(id);
  }

  get(id: string): T {
    const item = this.items.get(id);
    if (!item) {
      throw new RegistryError('NOT_FOUND', `${this.kind} "${id}" is not registered`);
    }
    return item;
  }

  list(): T[] {
    return [...this.items.values()];
  }
}
