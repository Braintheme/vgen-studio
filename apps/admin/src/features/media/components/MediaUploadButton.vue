<script setup lang="ts">
import { Upload } from '@lucide/vue';
import { UPLOAD_MIME_TYPES } from '@vgen/shared';
import { ref } from 'vue';
import { Button } from '@/components/ui/button';

/** "Upload": several photos / videos at once, straight into the library. */
defineProps<{
  /** Upload progress 0..1, or null when idle. */
  progress: number | null;
}>();

const emit = defineEmits<{ files: [files: File[]] }>();
const input = ref<HTMLInputElement | null>(null);
const accept = [...UPLOAD_MIME_TYPES.image, ...UPLOAD_MIME_TYPES.video].join(',');

const pick = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  emit('files', [...(target.files ?? [])]);
  target.value = '';
};
</script>

<template>
  <input ref="input" type="file" class="hidden" multiple :accept="accept" @change="pick" />
  <Button :disabled="progress !== null" @click="input?.click()">
    <Upload />
    <template v-if="progress === null">Upload</template>
    <template v-else>Uploading {{ Math.round(progress * 100) }}%</template>
  </Button>
</template>
