<script setup lang="ts" generic="TData">
import { FlexRender, getCoreRowModel, useVueTable, type ColumnDef } from '@tanstack/vue-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const props = withDefaults(
  defineProps<{
    columns: ColumnDef<TData>[];
    data: TData[];
    getRowId: (row: TData) => string;
    loading?: boolean;
    skeletonRows?: number;
  }>(),
  { loading: false, skeletonRows: 5 },
);

defineSlots<{
  /** Shown when there are no rows and nothing is loading. */
  empty?: () => unknown;
}>();

/** TanStack defaults `size` to 150; 0 marks columns without `size` as "take the remaining width". */
const STRETCH_COLUMN_SIZE = 0;

const table = useVueTable({
  defaultColumn: { size: STRETCH_COLUMN_SIZE },
  get data() {
    return props.data;
  },
  get columns() {
    return props.columns;
  },
  getRowId: (row) => props.getRowId(row),
  getCoreRowModel: getCoreRowModel(),
});
</script>

<template>
  <div class="overflow-hidden rounded-lg border">
    <!-- Fixed layout: sized columns keep their width, unsized ones share the rest. -->
    <Table class="min-w-2xl table-fixed">
      <TableHeader class="bg-muted/50">
        <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
          <TableHead
            v-for="header in headerGroup.headers"
            :key="header.id"
            :style="{ width: header.column.columnDef.size ? `${header.column.columnDef.size}px` : undefined }"
          >
            <FlexRender
              v-if="!header.isPlaceholder"
              :render="header.column.columnDef.header"
              :props="header.getContext()"
            />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-if="loading && data.length === 0">
          <TableRow v-for="index in skeletonRows" :key="`skeleton-${index}`">
            <TableCell v-for="column in columns" :key="column.id">
              <Skeleton class="h-6 w-full" />
            </TableCell>
          </TableRow>
        </template>
        <template v-else-if="table.getRowModel().rows.length > 0">
          <TableRow v-for="row in table.getRowModel().rows" :key="row.id">
            <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </TableCell>
          </TableRow>
        </template>
        <TableRow v-else>
          <TableCell :colspan="columns.length" class="p-0">
            <slot name="empty" />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
