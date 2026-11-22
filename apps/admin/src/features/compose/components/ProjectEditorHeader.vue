<script setup lang="ts">
import { ArrowLeft, ChevronLeft, ChevronRight, CircleAlert, Pencil } from '@lucide/vue';
import type { ProjectNeighborsDto } from '@vgen/shared';
import { nextTick, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProjectStatusView } from '@/lib/project-status';
import { routeTo } from '@/lib/routes';

/** The project editor's header: back to the list, the editable name, saving and render state. */
const props = defineProps<{
  name: string;
  templateName: string;
  status: ProjectStatusView;
  saving: boolean;
  failed: boolean;
  /** Place in the projects list and the neighbours; null while loading. */
  neighbors: ProjectNeighborsDto | null;
}>();

const emit = defineEmits<{
  rename: [name: string];
  retry: [];
}>();

const editing = ref(false);
const draft = ref('');
const input = ref<InstanceType<typeof Input> | null>(null);

const startEditing = async (): Promise<void> => {
  draft.value = props.name;
  editing.value = true;
  await nextTick();
  (input.value?.$el as HTMLInputElement | undefined)?.select();
};

const finish = (save: boolean): void => {
  if (!editing.value) return;
  editing.value = false;
  if (save) emit('rename', draft.value);
};

const TONE_CLASS: Record<ProjectStatusView['tone'], string> = {
  idle: 'text-muted-foreground',
  active: 'text-foreground',
  done: 'text-emerald-600 dark:text-emerald-500',
  failed: 'text-destructive',
};
</script>

<template>
  <div class="grid gap-2">
    <div class="flex items-center justify-between gap-4">
      <RouterLink
        :to="routeTo.projects()"
        class="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft class="size-4" /> Projects
      </RouterLink>
      <!-- Review project after project without going back to the table (its order: newest first). -->
      <nav v-if="neighbors" class="flex items-center gap-1 text-sm" aria-label="Neighbouring projects">
        <Button v-if="neighbors.previous" variant="ghost" size="sm" as-child>
          <RouterLink
            :to="routeTo.project(neighbors.previous.id)"
            :title="`Previous: ${neighbors.previous.name}`"
          >
            <ChevronLeft /> Prev
          </RouterLink>
        </Button>
        <Button v-else variant="ghost" size="sm" disabled><ChevronLeft /> Prev</Button>
        <span class="px-1 tabular-nums text-muted-foreground"
          >{{ neighbors.position }} / {{ neighbors.total }}</span
        >
        <Button v-if="neighbors.next" variant="ghost" size="sm" as-child>
          <RouterLink :to="routeTo.project(neighbors.next.id)" :title="`Next: ${neighbors.next.name}`">
            Next <ChevronRight />
          </RouterLink>
        </Button>
        <Button v-else variant="ghost" size="sm" disabled>Next <ChevronRight /></Button>
      </nav>
    </div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0 space-y-1">
        <Input
          v-if="editing"
          ref="input"
          v-model="draft"
          class="h-9 max-w-xl text-xl font-semibold"
          aria-label="Project name"
          @keydown.enter="finish(true)"
          @keydown.esc="finish(false)"
          @blur="finish(true)"
        />
        <button
          v-else
          type="button"
          class="group inline-flex max-w-full items-center gap-2 text-left text-2xl font-semibold tracking-tight"
          title="Rename"
          @click="startEditing"
        >
          <span class="truncate">{{ name }}</span>
          <Pencil class="size-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
        </button>
        <p class="text-sm text-muted-foreground">
          {{ templateName }} ·
          <RouterLink
            v-if="status.renderId"
            :to="routeTo.renders()"
            :class="TONE_CLASS[status.tone]"
            class="hover:underline"
          >
            {{ status.label }}
          </RouterLink>
          <span v-else :class="TONE_CLASS[status.tone]">{{ status.label }}</span>
          <template v-if="status.editedSinceRender"> · edited since</template>
        </p>
      </div>
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <template v-if="failed">
          <CircleAlert class="size-4 text-destructive" /> Not saved
          <Button variant="outline" size="sm" @click="emit('retry')">Retry</Button>
        </template>
        <span v-else>{{ saving ? 'Saving…' : 'Saved' }}</span>
      </div>
    </div>
  </div>
</template>
