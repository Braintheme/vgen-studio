<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';

const props = defineProps<{
  page: number;
  pageSize: number;
  total: number;
}>();

const emit = defineEmits<{
  'update:page': [page: number];
}>();

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const firstItem = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1));
const lastItem = computed(() => Math.min(props.total, props.page * props.pageSize));
</script>

<template>
  <div class="flex items-center justify-between gap-4 text-sm text-muted-foreground">
    <span>{{ firstItem }}–{{ lastItem }} of {{ total }}</span>
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
