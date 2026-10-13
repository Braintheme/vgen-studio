<script setup lang="ts">
import { ArrowLeftRight } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MediaSlotView, MediaWarning, SlotActionView } from '@/features/compose/types';
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
  action: [action: SlotActionView];
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
        <MediaSlotCard
          v-for="slot in slots"
          :key="slot.key"
          :media-slot="slot"
          @upload="emit('upload', slot.key, $event)"
          @clear="emit('clear', slot.key)"
        />
      </div>
      <MediaWarnings :warnings="warnings" />
    </CardContent>
  </Card>
</template>
