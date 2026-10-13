<script setup lang="ts">
import type { RenderStatus } from '@vgen/shared';
import { computed } from 'vue';
import { Badge } from '@/components/ui/badge';
import { RENDER_STATUS_META } from '@/features/renders/constants';

const props = defineProps<{
  status: RenderStatus;
}>();

const meta = computed(() => RENDER_STATUS_META[props.status]);
</script>

<template>
  <Badge :variant="meta.tone">
    <component :is="meta.icon" :class="{ 'animate-spin': meta.spinning }" />
    {{ meta.label }}
  </Badge>
</template>
