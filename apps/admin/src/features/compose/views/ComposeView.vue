<script setup lang="ts">
import { LayoutTemplate } from '@lucide/vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { useComposeTarget } from '@/features/compose/composables/useComposeScreen';
import ComposeWorkspace from '@/features/compose/views/ComposeWorkspace.vue';

const target = useComposeTarget();
</script>

<template>
  <EmptyState
    v-if="target.status === 'missing'"
    :icon="LayoutTemplate"
    title="Template not found"
    :description="`There is no template “${target.templateId}”. Pick one from the gallery.`"
  />
  <ComposeWorkspace v-else :key="target.template.id" :template="target.template" :project="null" />
</template>
