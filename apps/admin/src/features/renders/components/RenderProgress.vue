<script setup lang="ts">
import type { RenderStatus } from '@vgen/shared';
import { Progress } from '@/components/ui/progress';

defineProps<{
  status: RenderStatus;
  progress: number;
}>();
</script>

<template>
  <div v-if="status === 'rendering'" class="flex items-center gap-2">
    <Progress :model-value="progress" class="h-1.5 w-24" />
    <span class="w-9 text-right text-xs tabular-nums text-muted-foreground">{{ progress }}%</span>
  </div>
  <span v-else-if="status === 'queued'" class="text-xs text-muted-foreground">Waiting in queue</span>
</template>
