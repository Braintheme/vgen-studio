import { computed, type ComputedRef, type Ref } from 'vue';

/** The parts of a vue-query mutation needed to know which row it is working on. */
export interface PendingMutation {
  readonly isPending: Readonly<Ref<boolean>>;
  readonly variables: Readonly<Ref<unknown>>;
}

const idOf = (variables: unknown): string | null => {
  if (typeof variables === 'string') return variables;
  if (typeof variables === 'object' && variables !== null && 'id' in variables) {
    const { id } = variables;
    return typeof id === 'string' ? id : null;
  }
  return null;
};

/** Ids of rows with a mutation in flight (variables are an id or `{ id, ... }`). */
export const usePendingIds = (...mutations: readonly PendingMutation[]): ComputedRef<ReadonlySet<string>> =>
  computed(
    () =>
      new Set(
        mutations
          .filter((mutation) => mutation.isPending.value)
          .map((mutation) => idOf(mutation.variables.value))
          .filter((id): id is string => id !== null),
      ),
  );
