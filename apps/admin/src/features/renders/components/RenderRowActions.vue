<script setup lang="ts">
import { CircleAlert, Download, Ellipsis, ExternalLink, RotateCcw, Square, Trash2 } from '@lucide/vue';
import type { RenderJobDto } from '@vgen/shared';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ACTIVE_RENDER_STATUSES } from '@/features/renders/constants';

const props = defineProps<{
  render: RenderJobDto;
  busy: boolean;
}>();

const emit = defineEmits<{
  cancel: [render: RenderJobDto];
  remove: [render: RenderJobDto];
  duplicate: [render: RenderJobDto];
  showError: [render: RenderJobDto];
}>();

const isActive = computed(() => ACTIVE_RENDER_STATUSES.has(props.render.status));
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="size-8" :disabled="busy" aria-label="Render actions">
        <Ellipsis />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-44">
      <template v-if="render.output">
        <DropdownMenuItem as-child>
          <a :href="render.output.downloadUrl" :download="render.outputName"><Download /> Download</a>
        </DropdownMenuItem>
        <DropdownMenuItem as-child>
          <a :href="render.output.url" target="_blank" rel="noopener"><ExternalLink /> Open video</a>
        </DropdownMenuItem>
      </template>
      <DropdownMenuItem v-if="render.status === 'failed'" @select="emit('showError', render)">
        <CircleAlert /> View error
      </DropdownMenuItem>
      <DropdownMenuItem @select="emit('duplicate', render)"><RotateCcw /> Re-render</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem v-if="isActive" variant="destructive" @select="emit('cancel', render)">
        <Square /> Cancel
      </DropdownMenuItem>
      <DropdownMenuItem v-else variant="destructive" @select="emit('remove', render)">
        <Trash2 /> Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
