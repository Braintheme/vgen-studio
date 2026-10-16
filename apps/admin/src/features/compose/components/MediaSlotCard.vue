<script setup lang="ts">
import { Images, X } from '@lucide/vue';
import { computed } from 'vue';
import FileDropzone from '@/components/common/FileDropzone.vue';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatDuration } from '@/lib/format';
import type { MediaSlotView } from '@/features/compose/types';

const props = defineProps<{
  mediaSlot: MediaSlotView;
}>();

const emit = defineEmits<{
  upload: [files: File[]];
  clear: [];
  browse: [];
}>();

const preview = computed(() => props.mediaSlot.assets[0] ?? null);
const uploading = computed(() => props.mediaSlot.uploadProgress !== null);
</script>

<template>
  <div class="grid gap-2">
    <div class="flex items-baseline justify-between gap-2">
      <span class="text-sm font-medium">
        {{ mediaSlot.label }}<span v-if="mediaSlot.required" class="text-destructive"> *</span>
      </span>
      <span v-if="mediaSlot.description" class="truncate text-xs text-muted-foreground">{{
        mediaSlot.description
      }}</span>
    </div>
    <div class="relative">
      <FileDropzone
        :accept="mediaSlot.accept"
        :multiple="mediaSlot.multiple"
        :disabled="uploading"
        :hint="`Drop ${mediaSlot.label.toLowerCase()} here or click to browse`"
        @files="emit('upload', $event)"
      >
        <img
          v-if="preview?.previewUrl"
          :src="preview.previewUrl"
          :alt="mediaSlot.label"
          class="h-44 w-full object-cover"
        />
      </FileDropzone>
      <span
        v-if="preview && mediaSlot.kind === 'video' && preview.durationSec !== null"
        class="absolute bottom-2 left-2 rounded bg-background/85 px-1.5 text-xs tabular-nums"
      >
        {{ formatDuration(preview.durationSec) }}
      </span>
      <Button
        v-if="preview && !uploading"
        variant="secondary"
        size="icon"
        class="absolute top-2 right-2 size-7"
        :aria-label="`Remove ${mediaSlot.label}`"
        @click="emit('clear')"
      >
        <X />
      </Button>
      <div v-if="uploading" class="absolute inset-x-3 bottom-3">
        <Progress :model-value="(mediaSlot.uploadProgress ?? 0) * 100" class="h-1.5" />
      </div>
    </div>
    <Button
      v-if="mediaSlot.kind === 'image' || mediaSlot.kind === 'video'"
      variant="link"
      size="sm"
      class="h-auto justify-self-start p-0 text-xs"
      :disabled="uploading"
      @click="emit('browse')"
    >
      <Images class="size-3.5" /> From library
    </Button>
    <p v-if="mediaSlot.error" class="text-xs text-destructive">{{ mediaSlot.error }}</p>
  </div>
</template>
