<script setup lang="ts">
import { ArrowLeftRight } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MediaSlotView, MediaWarning, SlotActionView } from '@/features/compose/types';
import MediaGallerySlot from './MediaGallerySlot.vue';
import MediaSlotCard from './MediaSlotCard.vue';
import MediaWarnings from './MediaWarnings.vue';

defineProps<{
  slots: readonly MediaSlotView[];
  actions: readonly SlotActionView[];
  warnings: readonly MediaWarning[];
}>();

const emit = defineEmits<{
  upload: [slotKey: string, files: File[]];
  clear: [slotKey: string];
  remove: [slotKey: string, index: number];
  move: [slotKey: string, from: number, to: number];
  sort: [slotKey: string];
  swap: [slotKey: string, index: number];
  action: [action: SlotActionView];
  browse: [slotKey: string];
}>();
</script>

<template>
  <Card class="gap-4 py-4">
    <CardHeader class="flex flex-row items-center justify-between px-4">
      <CardTitle class="text-sm">Media</CardTitle>
      <Button
        v-for="action in actions"
        :key="action.id"
        variant="outline"
        size="sm"
        :disabled="!action.enabled"
        @click="emit('action', action)"
      >
        <ArrowLeftRight /> {{ action.label }}
      </Button>
    </CardHeader>
    <CardContent class="grid gap-4 px-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <template v-for="slot in slots" :key="slot.key">
          <MediaGallerySlot
            v-if="slot.multiple"
            class="sm:col-span-2"
            :media-slot="slot"
            @upload="emit('upload', slot.key, $event)"
            @remove="(index) => emit('remove', slot.key, index)"
            @move="(from, to) => emit('move', slot.key, from, to)"
            @browse="emit('browse', slot.key)"
            @sort="emit('sort', slot.key)"
            @swap="(index) => emit('swap', slot.key, index)"
          />
          <MediaSlotCard
            v-else
            :media-slot="slot"
            @upload="emit('upload', slot.key, $event)"
            @clear="emit('clear', slot.key)"
            @browse="emit('browse', slot.key)"
          />
        </template>
      </div>
      <MediaWarnings :warnings="warnings" />
    </CardContent>
  </Card>
</template>
