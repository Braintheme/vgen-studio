<script setup lang="ts">
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FieldOf } from '@/components/schema-form/types';

const props = defineProps<{
  field: FieldOf<'select'> | FieldOf<'font'>;
}>();

/** Select works with strings; restore the option's original type (e.g. numbers). */
const toValue = (raw: unknown): string | number | undefined =>
  props.field.options.find((option) => String(option.value) === String(raw))?.value;
</script>

<template>
  <FormField v-slot="{ value, handleChange }" :name="field.path">
    <FormItem>
      <FormLabel>{{ field.label }}</FormLabel>
      <Select :model-value="String(value)" @update:model-value="(raw) => handleChange(toValue(raw))">
        <FormControl>
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem
            v-for="option in field.options"
            :key="String(option.value)"
            :value="String(option.value)"
          >
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
