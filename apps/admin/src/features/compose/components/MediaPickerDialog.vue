<script setup lang="ts">
import DataTablePagination from '@/components/common/DataTablePagination.vue';
import MediaLibraryGrid from '@/components/common/MediaLibraryGrid.vue';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { MediaTileView } from '@/lib/ui-types';
import type { MediaPickerSlot } from '@/features/compose/types';

/** Choose already uploaded photos / videos for a media slot. */
defineProps<{
  target: MediaPickerSlot | null;
  tiles: readonly MediaTileView[];
  total: number;
  pageSize: number;
  loading: boolean;
  selectedCount: number;
}>();

const emit = defineEmits<{
  toggle: [id: string];
  confirm: [];
}>();
const open = defineModel<boolean>('open', { required: true });
const page = defineModel<number>('page', { required: true });
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>{{ target?.label ?? 'Media' }}: choose from the library</DialogTitle>
        <DialogDescription>
          {{
            target && target.room > 1
              ? `Select up to ${target.room} ${target.kind === 'video' ? 'videos' : 'photos'}.`
              : `Select one ${target?.kind === 'video' ? 'video' : 'photo'}.`
          }}
        </DialogDescription>
      </DialogHeader>
      <MediaLibraryGrid
        :tiles="tiles"
        :loading="loading"
        :empty-title="target?.kind === 'video' ? 'No videos uploaded yet' : 'No photos uploaded yet'"
        @toggle="emit('toggle', $event)"
      />
      <DataTablePagination v-if="total > pageSize" v-model:page="page" :page-size="pageSize" :total="total" />
      <DialogFooter>
        <Button variant="outline" @click="open = false">Cancel</Button>
        <Button :disabled="selectedCount === 0" @click="emit('confirm')">
          Add {{ selectedCount > 0 ? selectedCount : '' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
