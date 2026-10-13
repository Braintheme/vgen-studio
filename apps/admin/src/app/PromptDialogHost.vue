<script setup lang="ts">
// The one text-prompt dialog of the app; features ask through usePrompt().
import { computed } from 'vue';
import PromptDialog from '@/components/common/PromptDialog.vue';
import { usePromptHost } from '@/composables/usePrompt';

const { state, settle } = usePromptHost();

const open = computed({
  get: () => state.open,
  set: (value: boolean) => {
    if (!value) settle(null);
  },
});
</script>

<template>
  <PromptDialog
    v-if="state.options"
    v-model:open="open"
    :title="state.options.title"
    :description="state.options.description"
    :label="state.options.label"
    :initial-value="state.options.initialValue"
    :confirm-label="state.options.confirmLabel"
    :max-length="state.options.maxLength"
    @submit="settle"
  />
</template>
