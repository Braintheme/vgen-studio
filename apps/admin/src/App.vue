<script setup lang="ts">
import 'vue-sonner/style.css';
import ConfirmDialogHost from '@/app/ConfirmDialogHost.vue';
import PromptDialogHost from '@/app/PromptDialogHost.vue';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { provideConfirm } from '@/composables/useConfirm';
import { providePrompt } from '@/composables/usePrompt';

provideConfirm();
providePrompt();
</script>

<template>
  <TooltipProvider>
    <RouterView />
  </TooltipProvider>
  <ConfirmDialogHost />
  <PromptDialogHost />
  <Toaster rich-colors close-button />
</template>
