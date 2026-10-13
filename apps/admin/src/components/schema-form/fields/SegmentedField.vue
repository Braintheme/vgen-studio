<script setup lang="ts">
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { FieldOf } from '@/components/schema-form/types';

const props = defineProps<{
  field: FieldOf<'segmented'>;
}>();

const toValue = (raw: unknown): string | number | undefined =>
  props.field.options.find((option) => String(option.value) === String(raw))?.value;
</script>

<template>
  <FormField v-slot="{ value, handleChange }" :name="field.path">
    <FormItem>
      <FormLabel>{{ field.label }}</FormLabel>
      <FormControl>
        <!-- A segmented control always has a value: ignore "deselect" clicks (empty value). -->
        <ToggleGroup
          type="single"
          variant="outline"
          class="w-full"
          :model-value="String(value)"
          @update:model-value="(raw) => raw && handleChange(toValue(raw))"
        >
          <ToggleGroupItem
            v-for="option in field.options"
            :key="String(option.value)"
            :value="String(option.value)"
            class="flex-1"
          >
            {{ option.label }}
          </ToggleGroupItem>
        </ToggleGroup>
      </FormControl>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
