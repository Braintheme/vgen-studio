<script setup lang="ts">
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { FieldOf } from '@/components/schema-form/types';

defineProps<{
  field: FieldOf<'string'>;
}>();
</script>

<template>
  <FormField v-slot="{ value, handleChange }" :name="field.path">
    <FormItem>
      <FormLabel>{{ field.label }}</FormLabel>
      <FormControl>
        <Input
          :model-value="String(value ?? '')"
          :maxlength="field.maxLength ?? undefined"
          @update:model-value="handleChange"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
