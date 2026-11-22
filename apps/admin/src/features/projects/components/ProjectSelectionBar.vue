<script setup lang="ts">
import { Sparkles, Trash2, X } from '@lucide/vue';
import { Button } from '@/components/ui/button';

/** Sticky bar while projects are selected: how many, and the bulk actions. */
defineProps<{
  count: number;
  busy: boolean;
}>();

const emit = defineEmits<{
  render: [];
  remove: [];
  clear: [];
}>();
</script>

<template>
  <div
    class="sticky bottom-4 z-10 mx-auto flex w-fit max-w-full items-center gap-3 rounded-full border bg-background/95 px-4 py-2 shadow-lg backdrop-blur"
  >
    <span class="text-sm font-medium tabular-nums">{{ count }} selected</span>
    <Button variant="ghost" size="sm" @click="emit('clear')"><X /> Clear</Button>
    <Button variant="ghost" size="sm" class="text-destructive" :disabled="busy" @click="emit('remove')">
      <Trash2 /> Delete
    </Button>
    <Button size="sm" :disabled="busy" @click="emit('render')"><Sparkles /> Render {{ count }}</Button>
  </div>
</template>
