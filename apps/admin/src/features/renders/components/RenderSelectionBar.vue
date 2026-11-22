<script setup lang="ts">
import { Download, FolderDown, LoaderCircle, Square, X } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

/** Sticky bar while renders are selected: what is selected, saving progress and the bulk actions. */
const props = defineProps<{
  count: number;
  sizeLabel: string;
  /** Saves into a picked folder (else plain downloads). */
  toFolder: boolean;
  /** Saving now: done of total, the current file. */
  progress: { readonly done: number; readonly total: number; readonly current: string | null } | null;
}>();

const emit = defineEmits<{
  save: [];
  stop: [];
  clear: [];
}>();

const percent = (): number => (props.progress ? (props.progress.done / props.progress.total) * 100 : 0);
</script>

<template>
  <div
    class="sticky bottom-4 z-10 mx-auto flex w-fit max-w-full items-center gap-3 rounded-full border bg-background/95 px-4 py-2 shadow-lg backdrop-blur"
  >
    <template v-if="progress">
      <LoaderCircle class="size-4 animate-spin text-muted-foreground" />
      <span class="text-sm font-medium tabular-nums">
        Saving {{ progress.done + 1 }} / {{ progress.total }}
      </span>
      <Progress :model-value="percent()" class="w-32" />
      <span
        v-if="progress.current"
        class="max-w-56 truncate text-xs text-muted-foreground"
        :title="progress.current"
      >
        {{ progress.current }}
      </span>
      <Button variant="ghost" size="sm" @click="emit('stop')"><Square /> Stop</Button>
    </template>
    <template v-else>
      <span class="text-sm font-medium tabular-nums">{{ count }} selected · {{ sizeLabel }}</span>
      <Button variant="ghost" size="sm" @click="emit('clear')"><X /> Clear</Button>
      <Button size="sm" @click="emit('save')">
        <template v-if="toFolder"><FolderDown /> Save to folder…</template>
        <template v-else><Download /> Download {{ count }}</template>
      </Button>
    </template>
  </div>
</template>
