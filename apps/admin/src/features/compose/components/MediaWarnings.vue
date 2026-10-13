<script setup lang="ts">
import { Info, TriangleAlert } from '@lucide/vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { MediaWarning } from '@/features/compose/types';

defineProps<{
  warnings: readonly MediaWarning[];
}>();
</script>

<template>
  <div v-if="warnings.length > 0" class="grid gap-2">
    <Alert v-for="warning in warnings" :key="warning.code">
      <TriangleAlert v-if="warning.severity === 'warning'" />
      <Info v-else />
      <AlertDescription>{{ warning.message }}</AlertDescription>
    </Alert>
  </div>
</template>
