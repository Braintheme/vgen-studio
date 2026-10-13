<script setup lang="ts">
import type { RenderJobDto } from '@vgen/shared';
import { computed } from 'vue';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/format';

/** The failed render to explain; `null` closes the dialog. */
const render = defineModel<RenderJobDto | null>('render', { required: true });

const open = computed({
  get: () => render.value !== null,
  set: (value: boolean) => {
    if (!value) render.value = null;
  },
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent v-if="render" class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Render failed</DialogTitle>
        <DialogDescription>
          {{ render.outputName
          }}<template v-if="render.finishedAt"> · {{ formatDateTime(render.finishedAt) }}</template> · attempt
          {{ render.attempts }}
        </DialogDescription>
      </DialogHeader>
      <pre class="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{{
        render.error ?? 'No error message was recorded.'
      }}</pre>
    </DialogContent>
  </Dialog>
</template>
