<script setup lang="ts">
// The one confirmation dialog of the app; features ask through useConfirm().
import { computed } from 'vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { useConfirmHost } from '@/composables/useConfirm';

const { state, settle } = useConfirmHost();

const open = computed({
  get: () => state.open,
  set: (value: boolean) => {
    if (!value) settle(false);
  },
});
</script>

<template>
  <ConfirmDialog
    v-if="state.options"
    v-model:open="open"
    :title="state.options.title"
    :description="state.options.description"
    :confirm-label="state.options.confirmLabel"
    :cancel-label="state.options.cancelLabel"
    :tone="state.options.tone"
    @confirm="settle(true)"
  />
</template>
