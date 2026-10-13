<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

defineProps<{
  connected: boolean;
}>();
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <span class="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <span class="relative flex size-2">
          <span
            v-if="connected"
            class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60"
          />
          <span
            class="relative inline-flex size-2 rounded-full"
            :class="connected ? 'bg-emerald-500' : 'bg-amber-500'"
          />
        </span>
        {{ connected ? 'Live' : 'Polling' }}
      </span>
    </TooltipTrigger>
    <TooltipContent>
      {{ connected ? 'Updates arrive in real time.' : 'Live updates unavailable; refreshing periodically.' }}
    </TooltipContent>
  </Tooltip>
</template>
