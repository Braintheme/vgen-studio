<script setup lang="ts">
import { Ellipsis, FolderOpen, Pencil, Trash2 } from '@lucide/vue';
import type { MediaGroupDto } from '@vgen/shared';
import EmptyState from '@/components/common/EmptyState.vue';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

/** The library's groups as cards: a cover (first files), the name and the count; opens a group. */
defineProps<{
  groups: readonly MediaGroupDto[];
  loading: boolean;
}>();

const emit = defineEmits<{
  open: [group: MediaGroupDto];
  rename: [group: MediaGroupDto];
  remove: [group: MediaGroupDto];
}>();

const covers = (group: MediaGroupDto) => group.items.slice(0, 4).map((item) => item.previewUrl ?? item.url);
</script>

<template>
  <div v-if="loading" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
    <Skeleton v-for="index in 6" :key="index" class="aspect-square w-full" />
  </div>
  <EmptyState
    v-else-if="groups.length === 0"
    :icon="FolderOpen"
    title="No groups yet"
    description="Select files (e.g. a preset's settings screenshots) and press “Create group” on the bar below."
  />
  <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
    <div
      v-for="group in groups"
      :key="group.id"
      class="group/card overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
    >
      <button type="button" class="block w-full text-left" @click="emit('open', group)">
        <div class="grid aspect-square grid-cols-2 grid-rows-2 gap-px bg-muted">
          <img
            v-for="(src, index) in covers(group)"
            :key="index"
            :src="src"
            alt=""
            loading="lazy"
            class="size-full object-cover"
            :class="covers(group).length === 1 ? 'col-span-2 row-span-2' : ''"
          />
        </div>
      </button>
      <div class="flex items-center gap-1 p-2">
        <button type="button" class="min-w-0 flex-1 text-left" @click="emit('open', group)">
          <span class="block truncate text-sm font-medium" :title="group.name">{{ group.name }}</span>
          <span class="text-xs text-muted-foreground tabular-nums">
            {{ group.items.length }} {{ group.items.length === 1 ? 'file' : 'files' }}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="size-7 shrink-0"
              :aria-label="`${group.name}: actions`"
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-36">
            <DropdownMenuItem @select="emit('rename', group)"><Pencil /> Rename</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" @select="emit('remove', group)"
              ><Trash2 /> Delete</DropdownMenuItem
            >
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
</template>
