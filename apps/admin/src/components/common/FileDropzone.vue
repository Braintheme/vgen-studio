<script setup lang="ts">
import { Upload } from '@lucide/vue';
import { ref, useTemplateRef } from 'vue';
import { cn } from '@/lib/utils';

const props = withDefaults(
  defineProps<{
    /** `accept` attribute of the file input (mime types / extensions). */
    accept: string;
    multiple?: boolean;
    disabled?: boolean;
    hint?: string;
  }>(),
  { multiple: false, disabled: false, hint: 'Drop a file here or click to browse' },
);

const emit = defineEmits<{
  files: [files: File[]];
}>();

defineSlots<{
  /** Replaces the default "drop here" content (e.g. a preview of the current file). */
  default?: () => unknown;
}>();

const input = useTemplateRef<HTMLInputElement>('input');
const dragging = ref(false);

const accepts = (file: File): boolean =>
  props.accept.split(',').some((rule) => {
    const pattern = rule.trim();
    return pattern.endsWith('/*') ? file.type.startsWith(pattern.slice(0, -1)) : file.type === pattern;
  });

const submit = (list: FileList | null): void => {
  const files = [...(list ?? [])].filter(accepts);
  if (files.length > 0) emit('files', props.multiple ? files : files.slice(0, 1));
};

const onDrop = (event: DragEvent): void => {
  dragging.value = false;
  if (!props.disabled) submit(event.dataTransfer?.files ?? null);
};

const onChange = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  submit(target.files);
  // Allow picking the same file again.
  target.value = '';
};

const browse = (): void => {
  if (!props.disabled) input.value?.click();
};
</script>

<template>
  <div
    role="button"
    tabindex="0"
    :aria-disabled="disabled"
    :class="
      cn(
        'relative flex min-h-36 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed text-sm text-muted-foreground transition-colors',
        dragging ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
        disabled && 'pointer-events-none opacity-60',
      )
    "
    @click="browse"
    @keydown.enter.prevent="browse"
    @keydown.space.prevent="browse"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <slot>
      <div class="flex flex-col items-center gap-2 p-6 text-center">
        <Upload class="size-5" />
        <span>{{ hint }}</span>
      </div>
    </slot>
    <input ref="input" type="file" class="hidden" :accept="accept" :multiple="multiple" @change="onChange" />
  </div>
</template>
