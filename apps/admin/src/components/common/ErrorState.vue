<script setup lang="ts">
import { CircleAlert, RotateCw } from '@lucide/vue';
import { Button } from '@/components/ui/button';

withDefaults(
  defineProps<{
    title?: string;
    message: string;
    retrying?: boolean;
  }>(),
  { title: 'Something went wrong', retrying: false },
);

const emit = defineEmits<{
  retry: [];
}>();
</script>

<template>
  <div
    role="alert"
    class="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
  >
    <CircleAlert class="mt-0.5 size-5 shrink-0 text-destructive" />
    <div class="flex-1 space-y-1">
      <p class="font-medium">{{ title }}</p>
      <p class="text-sm text-muted-foreground">{{ message }}</p>
    </div>
    <Button variant="outline" size="sm" :disabled="retrying" @click="emit('retry')">
      <RotateCw :class="{ 'animate-spin': retrying }" />
      Retry
    </Button>
  </div>
</template>
