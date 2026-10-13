<script setup lang="ts">
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { FieldOf } from '@/components/schema-form/types';

defineProps<{
  field: FieldOf<'number'>;
}>();

const toNumber = (raw: string | number): number | undefined => (raw === '' ? undefined : Number(raw));
</script>

<template>
  <FormField v-slot="{ value, handleChange }" :name="field.path">
    <FormItem>
      <FormLabel
        >{{ field.label
        }}<span v-if="field.unit" class="text-muted-foreground"> ({{ field.unit }})</span></FormLabel
      >
      <FormControl>
        <Input
          type="number"
          :min="field.min ?? undefined"
          :max="field.max ?? undefined"
          :model-value="typeof value === 'number' ? value : ''"
          @update:model-value="(raw) => handleChange(toNumber(raw))"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
