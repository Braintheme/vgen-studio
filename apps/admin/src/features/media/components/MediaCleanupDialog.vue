<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { CleanupPreview } from '@/features/media/types';

/** "Delete unused files older than N days": count first, then delete. */
defineProps<{
  preview: CleanupPreview | null;
  busy: boolean;
}>();

const emit = defineEmits<{
  check: [];
  confirm: [];
}>();
const open = defineModel<boolean>('open', { required: true });
const days = defineModel<number>('days', { required: true });

const toDays = (raw: string | number): number => Math.max(0, Math.min(3650, Math.round(Number(raw) || 0)));
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Clean up unused files</DialogTitle>
        <DialogDescription>
          Photos and videos that no render uses and no template's draft holds. Files in your current drafts
          are always kept.
        </DialogDescription>
      </DialogHeader>
      <label class="flex items-center gap-3 text-sm">
        Older than
        <Input
          type="number"
          min="0"
          max="3650"
          class="w-24"
          :model-value="days"
          @update:model-value="(raw) => (days = toDays(raw))"
        />
        days
      </label>
      <p v-if="preview" class="text-sm">
        <template v-if="preview.count > 0">
          <strong>{{ preview.count }}</strong> files, <strong>{{ preview.sizeLabel }}</strong> will be
          deleted. This cannot be undone.
        </template>
        <template v-else>Nothing to clean up.</template>
      </p>
      <DialogFooter>
        <Button variant="outline" :disabled="busy" @click="emit('check')">Count files</Button>
        <Button
          variant="destructive"
          :disabled="busy || !preview || preview.count === 0"
          @click="emit('confirm')"
        >
          Delete {{ preview && preview.count > 0 ? `${preview.count} files` : '' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
