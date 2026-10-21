<script setup lang="ts">
import { ArrowDownAZ, ArrowLeftRight, Images, ChevronLeft, ChevronRight, Plus, X } from '@lucide/vue';
import { computed, ref } from 'vue';
import FileDropzone from '@/components/common/FileDropzone.vue';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { MediaSlotView } from '@/features/compose/types';

/**
 * A list slot (e.g. screenshots): thumbnails in order, drag or arrows to reorder, add more.
 * Grouped slots (before/after pairs) label each item with its group and position.
 */
const props = defineProps<{
  mediaSlot: MediaSlotView;
}>();

const emit = defineEmits<{
  upload: [files: File[]];
  remove: [index: number];
  move: [from: number, to: number];
  browse: [];
  sort: [];
  /** Grouped slots: swap an item with its partner (e.g. before <-> after of a pair). */
  swap: [index: number];
}>();

const uploading = computed(() => props.mediaSlot.uploadProgress !== null);
const full = computed(() => props.mediaSlot.assets.length >= props.mediaSlot.maxItems);
const dragged = ref<number | null>(null);

const group = computed(() => props.mediaSlot.group);

/** `3 · After` in a grouped slot, the position otherwise. */
const itemLabel = (index: number): string => {
  const current = group.value;
  if (!current) return String(index + 1);
  return `${String(Math.floor(index / current.size) + 1)} · ${current.labels[index % current.size] ?? ''}`;
};

/** The other item of a pair exists (the last photo of an odd list has none). */
const hasPartner = (index: number): boolean => {
  const current = group.value;
  if (!current) return false;
  const start = index - (index % current.size);
  return start + current.size <= props.mediaSlot.assets.length;
};

const onDrop = (index: number): void => {
  if (dragged.value !== null && dragged.value !== index) emit('move', dragged.value, index);
  dragged.value = null;
};
</script>

<template>
  <div class="grid gap-2">
    <div class="flex items-baseline justify-between gap-2">
      <span class="text-sm font-medium">
        {{ mediaSlot.label }}<span v-if="mediaSlot.required" class="text-destructive"> *</span>
        <span class="ml-1 text-xs font-normal text-muted-foreground">
          {{ mediaSlot.assets.length }} / {{ mediaSlot.maxItems }}
        </span>
      </span>
      <span v-if="mediaSlot.description" class="truncate text-xs text-muted-foreground">
        {{ mediaSlot.description }}
      </span>
    </div>
    <!-- Grouped slots use an even column count, so a pair always shares a row. -->
    <div class="grid gap-2" :class="group ? 'grid-cols-4 sm:grid-cols-6' : 'grid-cols-3 sm:grid-cols-5'">
      <div
        v-for="(asset, index) in mediaSlot.assets"
        :key="`${asset.id}-${index}`"
        class="group relative aspect-[4/5] cursor-grab overflow-hidden rounded-md border bg-muted"
        :class="dragged === index && 'opacity-40'"
        :title="asset.originalName"
        draggable="true"
        @dragstart="dragged = index"
        @dragend="dragged = null"
        @dragover.prevent
        @drop.prevent="onDrop(index)"
      >
        <img
          :src="asset.previewUrl ?? asset.url"
          :alt="`${mediaSlot.label} ${index + 1}`"
          class="size-full object-contain"
        />
        <span class="absolute top-1 left-1 rounded bg-background/80 px-1.5 text-xs tabular-nums">{{
          itemLabel(index)
        }}</span>
        <span
          v-if="group"
          class="absolute inset-x-0 bottom-0 truncate bg-background/70 px-1 text-[10px] group-hover:opacity-0"
          >{{ asset.originalName }}</span
        >
        <Button
          variant="secondary"
          size="icon"
          class="absolute top-1 right-1 size-6"
          :aria-label="`Remove ${mediaSlot.label.toLowerCase()} ${index + 1}`"
          @click="emit('remove', index)"
        >
          <X />
        </Button>
        <div class="absolute inset-x-1 bottom-1 flex justify-between opacity-0 group-hover:opacity-100">
          <Button
            variant="secondary"
            size="icon"
            class="size-6"
            :disabled="index === 0"
            aria-label="Move earlier"
            @click="emit('move', index, index - 1)"
          >
            <ChevronLeft />
          </Button>
          <Button
            v-if="group"
            variant="secondary"
            size="icon"
            class="size-6"
            :disabled="!hasPartner(index)"
            :aria-label="`Swap ${itemLabel(index)} with its pair`"
            :title="`Swap ${group.labels.join(' / ').toLowerCase()} in this pair`"
            @click="emit('swap', index)"
          >
            <ArrowLeftRight />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            class="size-6"
            :disabled="index === mediaSlot.assets.length - 1"
            aria-label="Move later"
            @click="emit('move', index, index + 1)"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <FileDropzone
        v-if="!full"
        class="aspect-[4/5]"
        :accept="mediaSlot.accept"
        multiple
        :disabled="uploading"
        hint="Add"
        @files="emit('upload', $event)"
      >
        <div class="flex flex-col items-center gap-1 p-2 text-center text-xs">
          <Plus class="size-5" />
          <span>{{ mediaSlot.assets.length === 0 ? 'Drop or browse' : 'Add more' }}</span>
        </div>
      </FileDropzone>
    </div>
    <div class="flex gap-4">
      <Button
        v-if="mediaSlot.kind === 'image' || mediaSlot.kind === 'video'"
        variant="link"
        size="sm"
        class="h-auto p-0 text-xs"
        :disabled="uploading"
        @click="emit('browse')"
      >
        <Images class="size-3.5" /> From library
      </Button>
      <Button
        v-if="group && mediaSlot.assets.length > 1"
        variant="link"
        size="sm"
        class="h-auto p-0 text-xs"
        :disabled="uploading"
        @click="emit('sort')"
      >
        <ArrowDownAZ class="size-3.5" /> Sort by name
      </Button>
    </div>
    <Progress v-if="uploading" :model-value="(mediaSlot.uploadProgress ?? 0) * 100" class="h-1.5" />
    <p v-if="mediaSlot.error" class="text-xs text-destructive">{{ mediaSlot.error }}</p>
  </div>
</template>
