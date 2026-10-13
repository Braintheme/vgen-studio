<script setup lang="ts" generic="TValue extends string">
import { computed } from 'vue';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
const props = defineProps<{
  label: string;
  options: readonly { readonly value: TValue; readonly label: string }[];
  /** Label of the "no filter" choice. */
  allLabel: string;
}>();

/** `null` = no filter. */
const model = defineModel<TValue | null>({ required: true });

// Reka's Select cannot hold an empty value, so "all" is a sentinel inside this component only.
const ALL = '__all__';

const selected = computed<string>({
  get: () => model.value ?? ALL,
  set: (value) => {
    model.value = props.options.find((option) => option.value === value)?.value ?? null;
  },
});
</script>

<template>
  <Select v-model="selected">
    <SelectTrigger class="w-44" :aria-label="label">
      <SelectValue :placeholder="label" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem :value="ALL">{{ allLabel }}</SelectItem>
      <SelectItem v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
