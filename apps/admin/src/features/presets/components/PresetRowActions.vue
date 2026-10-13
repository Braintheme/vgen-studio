<script setup lang="ts">
import { Ellipsis, Pencil, Star, Trash2 } from '@lucide/vue';
import type { StylePresetDto } from '@vgen/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

defineProps<{
  preset: StylePresetDto;
  busy: boolean;
}>();

const emit = defineEmits<{
  open: [preset: StylePresetDto];
  rename: [preset: StylePresetDto];
  makeDefault: [preset: StylePresetDto];
  remove: [preset: StylePresetDto];
}>();
</script>

<template>
  <div class="flex justify-end gap-1">
    <Button variant="outline" size="sm" :disabled="busy" @click="emit('open', preset)">Open in editor</Button>
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="icon" class="size-8" :disabled="busy" aria-label="Preset actions">
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-44">
        <DropdownMenuItem @select="emit('rename', preset)"><Pencil /> Rename</DropdownMenuItem>
        <DropdownMenuItem v-if="!preset.isDefault" @select="emit('makeDefault', preset)">
          <Star /> Make default
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" @select="emit('remove', preset)"
          ><Trash2 /> Delete</DropdownMenuItem
        >
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
