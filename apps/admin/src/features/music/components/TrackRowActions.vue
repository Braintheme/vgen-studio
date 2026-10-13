<script setup lang="ts">
import { Ellipsis, Pencil, Star, Trash2 } from '@lucide/vue';
import type { MusicTrackDto } from '@vgen/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

defineProps<{
  track: MusicTrackDto;
  busy: boolean;
}>();

const emit = defineEmits<{
  rename: [track: MusicTrackDto];
  makeDefault: [track: MusicTrackDto];
  remove: [track: MusicTrackDto];
}>();
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="size-8" :disabled="busy" aria-label="Track actions">
        <Ellipsis />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-44">
      <DropdownMenuItem @select="emit('rename', track)"><Pencil /> Rename</DropdownMenuItem>
      <DropdownMenuItem v-if="!track.isDefault" @select="emit('makeDefault', track)"
        ><Star /> Make default</DropdownMenuItem
      >
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" @select="emit('remove', track)"
        ><Trash2 /> Delete</DropdownMenuItem
      >
    </DropdownMenuContent>
  </DropdownMenu>
</template>
