<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
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

/** "Duplicate project": the copy's name (prefilled, selected), then keep listing or open it. */
const props = defineProps<{
  /** The project being copied; null closes the dialog. */
  sourceName: string | null;
  /** Prefilled name of the copy. */
  suggestedName: string;
  busy: boolean;
}>();

const emit = defineEmits<{
  duplicate: [name: string, open: boolean];
  cancel: [];
}>();

const name = ref('');
const input = ref<InstanceType<typeof Input> | null>(null);

watch(
  () => props.sourceName,
  async (source) => {
    if (source === null) return;
    name.value = props.suggestedName;
    await nextTick();
    // Selected, so typing replaces it; arrows keep it.
    (input.value?.$el as HTMLInputElement | undefined)?.select();
  },
);

const submit = (open: boolean): void => {
  if (name.value.trim() && !props.busy) emit('duplicate', name.value.trim(), open);
};
</script>

<template>
  <Dialog :open="sourceName !== null" @update:open="(isOpen) => !isOpen && emit('cancel')">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Duplicate project</DialogTitle>
        <DialogDescription>
          A copy of “{{ sourceName }}” with the same template, settings, media and preset. Its renders are not
          copied.
        </DialogDescription>
      </DialogHeader>
      <label class="grid gap-1.5 text-sm">
        <span class="font-medium">Name of the copy</span>
        <Input ref="input" v-model="name" maxlength="256" @keydown.enter.prevent="submit(false)" />
      </label>
      <DialogFooter>
        <Button variant="outline" :disabled="busy" @click="emit('cancel')">Cancel</Button>
        <Button variant="outline" :disabled="busy || !name.trim()" @click="submit(true)"
          >Duplicate and open</Button
        >
        <Button :disabled="busy || !name.trim()" @click="submit(false)">Duplicate</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
