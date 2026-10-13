<script setup lang="ts">
import { Pause, Play } from '@lucide/vue';
import { Button } from '@/components/ui/button';

defineProps<{
  playing: boolean;
  title: string;
}>();

const emit = defineEmits<{
  toggle: [];
}>();
</script>

<template>
  <Button
    variant="outline"
    size="icon"
    class="size-8 rounded-full"
    :aria-label="`${playing ? 'Pause' : 'Play'} ${title}`"
    @click="emit('toggle')"
  >
    <Pause v-if="playing" />
    <Play v-else />
  </Button>
</template>
