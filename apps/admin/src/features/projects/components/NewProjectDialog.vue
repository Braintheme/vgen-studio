<script setup lang="ts">
import { ref, watch } from 'vue';
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NewProjectGroup } from '@/features/projects/types';

/** "New project": a template (with its default preset) or one of its presets, and a name. */
defineProps<{
  groups: readonly NewProjectGroup[];
  creating: boolean;
}>();

const emit = defineEmits<{ create: [choice: string, name: string] }>();
const open = defineModel<boolean>('open', { required: true });

const choice = ref('');
const name = ref('');

watch(open, (isOpen) => {
  if (isOpen) name.value = '';
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>New project</DialogTitle>
        <DialogDescription>
          Start from a template (with its default preset) or from one of its presets. The project opens in the
          editor; every change is saved on its own.
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-3">
        <label class="grid gap-1.5 text-sm">
          <span class="font-medium">Start from</span>
          <Select v-model="choice">
            <SelectTrigger class="w-full" aria-label="Template or preset">
              <SelectValue placeholder="Pick a template or a preset" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup v-for="group in groups" :key="group.templateName">
                <SelectLabel>{{ group.templateName }}</SelectLabel>
                <SelectItem v-for="option in group.choices" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </label>
        <label class="grid gap-1.5 text-sm">
          <span class="font-medium"
            >Name <span class="font-normal text-muted-foreground">(optional)</span></span
          >
          <Input v-model="name" placeholder="The preset's or template's name" maxlength="256" />
        </label>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="open = false">Cancel</Button>
        <Button :disabled="!choice || creating" @click="emit('create', choice, name)">
          {{ creating ? 'Creating…' : 'Create and open' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
