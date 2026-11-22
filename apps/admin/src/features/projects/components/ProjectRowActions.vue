<script setup lang="ts">
import { Copy, Ellipsis, Pencil, Sparkles, Trash2 } from '@lucide/vue';
import type { ProjectDto } from '@vgen/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { routeTo } from '@/lib/routes';

defineProps<{
  project: ProjectDto;
  busy: boolean;
}>();

const emit = defineEmits<{
  render: [project: ProjectDto];
  duplicate: [project: ProjectDto];
  remove: [project: ProjectDto];
}>();
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="size-8" :disabled="busy" aria-label="Project actions">
        <Ellipsis />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-40">
      <DropdownMenuItem as-child>
        <RouterLink :to="routeTo.project(project.id)"><Pencil /> Open</RouterLink>
      </DropdownMenuItem>
      <DropdownMenuItem @select="emit('render', project)"><Sparkles /> Render</DropdownMenuItem>
      <DropdownMenuItem @select="emit('duplicate', project)"><Copy /> Duplicate</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" @select="emit('remove', project)"
        ><Trash2 /> Delete</DropdownMenuItem
      >
    </DropdownMenuContent>
  </DropdownMenu>
</template>
