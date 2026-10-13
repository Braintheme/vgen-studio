<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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
import { Label } from '@/components/ui/label';

const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    label: string;
    initialValue?: string;
    confirmLabel?: string;
    maxLength?: number;
  }>(),
  { description: undefined, initialValue: '', confirmLabel: 'Save', maxLength: 256 },
);

const emit = defineEmits<{
  submit: [value: string];
}>();

/** Closing the dialog in any way means "cancelled". */
const open = defineModel<boolean>('open', { required: true });

const value = ref(props.initialValue);
watch(open, (isOpen) => {
  if (isOpen) value.value = props.initialValue;
});
const trimmed = computed(() => value.value.trim());

const submit = (): void => {
  if (trimmed.value) emit('submit', trimmed.value);
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <form class="grid gap-4" @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>{{ title }}</DialogTitle>
          <!-- Always present for screen readers; hidden when there is nothing to say. -->
          <DialogDescription :class="{ 'sr-only': !description }">{{
            description ?? label
          }}</DialogDescription>
        </DialogHeader>
        <div class="grid gap-2">
          <Label for="prompt-value">{{ label }}</Label>
          <Input id="prompt-value" v-model="value" :maxlength="maxLength" autofocus />
        </div>
        <DialogFooter>
          <Button type="submit" :disabled="!trimmed">{{ confirmLabel }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
