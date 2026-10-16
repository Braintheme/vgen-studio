<script setup lang="ts">
import { Trash2, X } from '@lucide/vue';
import { Button } from '@/components/ui/button';

/** Sticky bar while files are selected: what is selected and the bulk actions. */
defineProps<{
  count: number;
  sizeLabel: string;
  deleting: boolean;
}>();

const emit = defineEmits<{
  remove: [];
  selectPage: [];
  clear: [];
}>();
</script>

<template>
  <div
    class="sticky bottom-4 z-10 mx-auto flex w-fit items-center gap-3 rounded-full border bg-background/95 px-4 py-2 shadow-lg backdrop-blur"
  >
    <span class="text-sm font-medium tabular-nums">{{ count }} selected · {{ sizeLabel }}</span>
    <Button variant="ghost" size="sm" @click="emit('selectPage')">Select page</Button>
    <Button variant="ghost" size="sm" @click="emit('clear')"><X /> Clear</Button>
    <Button variant="destructive" size="sm" :disabled="deleting" @click="emit('remove')">
      <Trash2 /> Delete
    </Button>
  </div>
</template>
