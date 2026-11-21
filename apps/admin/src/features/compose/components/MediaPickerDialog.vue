<script setup lang="ts">
import { computed } from 'vue';
import MediaLibraryGrid from '@/components/common/MediaLibraryGrid.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
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

/** Choose already uploaded photos / videos for a media slot, loading more as needed. */
const props = defineProps<{
  target: MediaPickerSlot | null;
  tiles: readonly MediaTileView[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  selectedCount: number;
}>();

const emit = defineEmits<{
  toggle: [id: string];
  loadMore: [];
  confirm: [];
}>();
const open = defineModel<boolean>('open', { required: true });

const noun = computed(() => (props.target?.kind === 'video' ? 'video' : 'photo'));
const hint = computed(() => {
  const target = props.target;
  if (!target) return '';
  if (target.paired) return 'Select one photo, or two: the original goes to Before and its edit to After.';
  return target.room > 1
    ? `Select up to ${String(target.room)} ${noun.value}s.`
    : `Select one ${noun.value}.`;
});
</script>

<template>
  <Dialog v-model:open="open">
    <!-- A column: the grid scrolls, the header and the footer stay in view. -->
    <DialogContent class="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
      <DialogHeader class="border-b p-6 pr-12">
        <DialogTitle>{{ target?.label ?? 'Media' }}: choose from the library</DialogTitle>
        <DialogDescription>{{ hint }}</DialogDescription>
      </DialogHeader>
      <div class="min-h-0 flex-1 overflow-y-auto p-6">
        <MediaLibraryGrid
          :tiles="tiles"
          :loading="loading"
          :empty-title="target?.kind === 'video' ? 'No videos uploaded yet' : 'No photos uploaded yet'"
          @toggle="emit('toggle', $event)"
        />
        <div v-if="tiles.length > 0" class="mt-6 grid justify-items-center gap-2">
          <Button v-if="hasMore" variant="outline" :disabled="loadingMore" @click="emit('loadMore')">
            <Spinner v-if="loadingMore" /> Load more
          </Button>
          <span class="text-xs text-muted-foreground tabular-nums">
            {{ tiles.length }} of {{ total }} {{ noun }}s
          </span>
        </div>
      </div>
      <DialogFooter class="items-center border-t bg-background px-6 py-4">
        <span v-if="selectedCount > 0" class="mr-auto text-sm text-muted-foreground">
          {{ selectedCount }} selected
        </span>
        <Button variant="outline" @click="open = false">Cancel</Button>
        <Button :disabled="selectedCount === 0" @click="emit('confirm')">
          Add {{ selectedCount > 0 ? selectedCount : '' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
