<script setup lang="ts">
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import type { FieldOf } from '@/components/schema-form/types';

const props = defineProps<{
  field: FieldOf<'slider'>;
}>();

const decimals = Math.max(0, -Math.floor(Math.log10(props.field.step)));
const display = (value: unknown): string =>
  `${typeof value === 'number' ? value.toFixed(decimals) : '—'}${props.field.unit ? ` ${props.field.unit}` : ''}`;
</script>

<template>
  <FormField v-slot="{ value, handleChange }" :name="field.path">
    <FormItem>
      <div class="flex items-center justify-between">
        <FormLabel>{{ field.label }}</FormLabel>
        <span class="text-xs tabular-nums text-muted-foreground">{{ display(value) }}</span>
      </div>
      <FormControl>
        <Slider
          :model-value="[typeof value === 'number' ? value : field.min]"
          :min="field.min"
          :max="field.max"
          :step="field.step"
          @update:model-value="(next) => next && handleChange(next[0])"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
