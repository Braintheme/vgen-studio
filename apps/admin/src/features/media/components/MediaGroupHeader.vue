<script setup lang="ts">
import { ArrowLeft, Pencil, Trash2 } from '@lucide/vue';
import type { MediaGroupDto } from '@vgen/shared';
import { Button } from '@/components/ui/button';

/** Above an open group's files: back to the group cards, its name, rename / delete. */
defineProps<{ group: MediaGroupDto }>();

const emit = defineEmits<{
  back: [];
  rename: [group: MediaGroupDto];
  remove: [group: MediaGroupDto];
}>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <Button variant="ghost" size="sm" @click="emit('back')"><ArrowLeft /> Groups</Button>
    <span class="text-sm text-muted-foreground">/</span>
    <span class="font-medium">{{ group.name }}</span>
    <span class="text-sm text-muted-foreground tabular-nums">
      {{ group.items.length }} {{ group.items.length === 1 ? 'file' : 'files' }}
    </span>
    <Button variant="ghost" size="sm" @click="emit('rename', group)"><Pencil /> Rename</Button>
    <Button variant="ghost" size="sm" class="text-destructive" @click="emit('remove', group)">
      <Trash2 /> Delete group
    </Button>
  </div>
</template>
