<script setup lang="ts">
import { computed } from 'vue';
import type { FieldSpec } from '@/lib/schema-form';
import type { FieldOf } from '@/components/schema-form/types';

/**
 * Columns side by side with their fields lined up row by row (e.g. before | after). Stacks
 * column after column on narrow screens. The cells come from the parent (`cell` slot), which
 * renders each field with the regular widgets.
 */
const props = defineProps<{
  field: FieldOf<'columns'>;
}>();

defineSlots<{ cell: (props: { field: FieldSpec }) => unknown }>();

/** Grid placement on wide screens: the header row, then one row per field index. */
const cells = computed(() =>
  props.field.columns.flatMap((column, columnIndex) =>
    column.fields.map((field, rowIndex) => ({ field, column: columnIndex + 1, row: rowIndex + 2 })),
  ),
);
</script>

<template>
  <div
    class="grid gap-x-6 gap-y-4 sm:[grid-template-columns:repeat(var(--columns),minmax(0,1fr))]"
    :style="{ '--columns': String(field.columns.length) }"
  >
    <div
      v-for="(column, index) in field.columns"
      :key="column.key"
      class="text-muted-foreground border-b pb-1 text-xs font-medium tracking-wide uppercase sm:[grid-column:var(--column)] sm:[grid-row:1]"
      :style="{ '--column': String(index + 1) }"
    >
      {{ column.label }}
    </div>
    <div
      v-for="cell in cells"
      :key="cell.field.path"
      class="sm:[grid-column:var(--column)] sm:[grid-row:var(--row)]"
      :style="{ '--column': String(cell.column), '--row': String(cell.row) }"
    >
      <slot name="cell" :field="cell.field" />
    </div>
  </div>
</template>
