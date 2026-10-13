<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { ConfirmTone } from '@/lib/ui-types';

withDefaults(
  defineProps<{
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: ConfirmTone;
  }>(),
  { description: undefined, confirmLabel: 'Confirm', cancelLabel: 'Cancel', tone: 'default' },
);

const emit = defineEmits<{
  confirm: [];
}>();

/**
 * Closing the dialog in any way (Cancel, Esc, overlay) means "not confirmed".
 * The confirm button is a plain Button on purpose: AlertDialogAction closes the dialog
 * before its click handler runs, which would report a cancel first.
 */
const open = defineModel<boolean>('open', { required: true });
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="description">{{ description }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ cancelLabel }}</AlertDialogCancel>
        <Button :variant="tone === 'destructive' ? 'destructive' : 'default'" @click="emit('confirm')">
          {{ confirmLabel }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
