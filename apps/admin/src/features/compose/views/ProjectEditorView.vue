<script setup lang="ts">
import { LayoutTemplate } from '@lucide/vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ErrorState from '@/components/common/ErrorState.vue';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectEditorTarget } from '@/features/compose/composables/useProjectEditorTarget';
import ComposeWorkspace from '@/features/compose/views/ComposeWorkspace.vue';

const target = useProjectEditorTarget();
</script>

<template>
  <div v-if="target.status === 'loading'" class="grid gap-4">
    <Skeleton class="h-10 w-80" />
    <Skeleton class="h-96 w-full" />
  </div>
  <ErrorState
    v-else-if="target.status === 'error'"
    title="Could not open the project"
    :message="target.error.message"
    :retrying="false"
    @retry="target.retry"
  />
  <EmptyState
    v-else-if="target.status === 'missing-template'"
    :icon="LayoutTemplate"
    title="Template not available"
    :description="`This project uses “${target.templateId}”, which is not installed or is turned off.`"
  />
  <ComposeWorkspace v-else :key="target.project.id" :template="target.template" :project="target.project" />
</template>
