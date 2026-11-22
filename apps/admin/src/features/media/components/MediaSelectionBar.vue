<script setup lang="ts">
import { FolderMinus, FolderPlus, Plus, Trash2, X } from '@lucide/vue';
import type { MediaGroupDto } from '@vgen/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Sticky bar while files are selected: what is selected and the bulk actions. */
defineProps<{
  count: number;
  sizeLabel: string;
  deleting: boolean;
  /** Groups the selection can be added to. */
  groups: readonly MediaGroupDto[];
  /** The group the library is filtered to: "Remove from" it. */
  activeGroup: MediaGroupDto | null;
  groupBusy: boolean;
}>();

const emit = defineEmits<{
  remove: [];
  selectPage: [];
  clear: [];
  createGroup: [];
  addToGroup: [groupId: string];
  removeFromGroup: [];
}>();
</script>

<template>
  <div
    class="sticky bottom-4 z-10 mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-full border bg-background/95 px-4 py-2 shadow-lg backdrop-blur"
  >
    <span class="text-sm font-medium tabular-nums">{{ count }} selected · {{ sizeLabel }}</span>
    <Button variant="ghost" size="sm" @click="emit('selectPage')">Select page</Button>
    <Button variant="ghost" size="sm" @click="emit('clear')"><X /> Clear</Button>
    <Button size="sm" :disabled="groupBusy" @click="emit('createGroup')"><FolderPlus /> Create group</Button>
    <DropdownMenu v-if="groups.length > 0">
      <DropdownMenuTrigger as-child>
        <Button variant="outline" size="sm" :disabled="groupBusy"><Plus /> Add to group</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" class="max-h-72 w-56 overflow-y-auto">
        <DropdownMenuItem v-for="group in groups" :key="group.id" @select="emit('addToGroup', group.id)">
          {{ group.name }}
          <span class="ml-auto text-xs tabular-nums text-muted-foreground">{{ group.items.length }}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Button
      v-if="activeGroup"
      variant="outline"
      size="sm"
      :disabled="groupBusy"
      @click="emit('removeFromGroup')"
    >
      <FolderMinus /> Remove from “{{ activeGroup.name }}”
    </Button>
    <Button variant="destructive" size="sm" :disabled="deleting" @click="emit('remove')">
      <Trash2 /> Delete
    </Button>
  </div>
</template>
