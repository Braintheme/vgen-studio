<script setup lang="ts">
import { Check, FileImage, Film } from '@lucide/vue';
import { Badge } from '@/components/ui/badge';
import type { MediaTileView } from '@/lib/ui-types';

/** One file of the media library: preview, size, age, what uses it; click toggles selection. */
defineProps<{
  tile: MediaTileView;
}>();

const emit = defineEmits<{
  toggle: [id: string];
}>();
</script>

<template>
  <button
    type="button"
    class="group relative overflow-hidden rounded-lg border bg-card text-left transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    :class="tile.selected ? 'ring-2 ring-primary' : ''"
    :aria-pressed="tile.selected"
    @click="emit('toggle', tile.id)"
  >
    <div class="relative aspect-square bg-muted">
      <img
        v-if="tile.previewUrl"
        :src="tile.previewUrl"
        :alt="tile.name"
        loading="lazy"
        class="size-full object-cover"
      />
      <div v-else class="flex size-full items-center justify-center text-muted-foreground">
        <Film v-if="tile.kind === 'video'" class="size-8" />
        <FileImage v-else class="size-8" />
      </div>
      <span
        class="absolute top-2 left-2 flex size-5 items-center justify-center rounded-full border-2 border-white shadow"
        :class="
          tile.selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-black/30 opacity-0 group-hover:opacity-100'
        "
      >
        <Check v-if="tile.selected" class="size-3" />
      </span>
      <Badge v-if="tile.durationLabel" variant="secondary" class="absolute right-2 bottom-2 gap-1">
        <Film class="size-3" /> {{ tile.durationLabel }}
      </Badge>
    </div>
    <div class="grid gap-1.5 p-2">
      <span class="truncate text-xs font-medium" :title="tile.name">{{ tile.name }}</span>
      <span class="text-[11px] text-muted-foreground">{{ tile.sizeLabel }} · {{ tile.dateLabel }}</span>
      <div class="flex flex-wrap gap-1">
        <Badge
          v-for="name in tile.draftTemplates"
          :key="name"
          class="bg-amber-500/15 text-amber-700 dark:text-amber-300"
          variant="outline"
          :title="`In the draft of ${name}`"
        >
          Draft: {{ name }}
        </Badge>
        <Badge v-if="tile.renderCount > 0" variant="secondary">
          {{ tile.renderCount }} render{{ tile.renderCount === 1 ? '' : 's' }}
        </Badge>
        <Badge
          v-if="tile.renderCount === 0 && tile.draftTemplates.length === 0"
          variant="outline"
          class="text-muted-foreground"
        >
          Unused
        </Badge>
      </div>
    </div>
  </button>
</template>
