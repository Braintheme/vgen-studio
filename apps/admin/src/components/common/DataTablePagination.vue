<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const props = defineProps<{
  page: number;
  pageSize: number;
  total: number;
  /** Rows-per-page choices; without them the page size is fixed. */
  pageSizeOptions?: readonly number[];
}>();

const emit = defineEmits<{
  'update:page': [page: number];
  'update:pageSize': [pageSize: number];
}>();

/** Reka's Select holds strings. */
const pageSizeValue = computed<string>({
  get: () => String(props.pageSize),
  set: (value) => {
    emit('update:pageSize', Number(value));
  },
});

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const firstItem = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1));
const lastItem = computed(() => Math.min(props.total, props.page * props.pageSize));
</script>

<template>
  <div class="flex items-center justify-between gap-4 text-sm text-muted-foreground">
    <div class="flex items-center gap-4">
      <span>{{ firstItem }}–{{ lastItem }} of {{ total }}</span>
      <div v-if="pageSizeOptions && pageSizeOptions.length > 1" class="flex items-center gap-2">
        <span>Rows per page</span>
        <Select v-model="pageSizeValue">
          <SelectTrigger size="sm" class="w-20" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in pageSizeOptions" :key="option" :value="String(option)">
              {{ option }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <span>Page {{ page }} of {{ pageCount }}</span>
      <Button
        variant="outline"
        size="icon"
        class="size-8"
        :disabled="page <= 1"
        aria-label="Previous page"
        @click="emit('update:page', page - 1)"
      >
        <ChevronLeft />
      </Button>
      <Button
        variant="outline"
        size="icon"
        class="size-8"
        :disabled="page >= pageCount"
        aria-label="Next page"
        @click="emit('update:page', page + 1)"
      >
        <ChevronRight />
      </Button>
    </div>
  </div>
</template>
