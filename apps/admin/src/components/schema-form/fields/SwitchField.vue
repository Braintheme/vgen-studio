<script setup lang="ts">
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import type { FieldOf } from '@/components/schema-form/types';

defineProps<{
  field: FieldOf<'switch'>;
}>();
</script>

<template>
  <FormField v-slot="{ value, handleChange }" :name="field.path">
    <FormItem class="flex items-center justify-between gap-4">
      <FormLabel>{{ field.label }}</FormLabel>
      <FormControl>
        <Switch :model-value="value === true" @update:model-value="handleChange" />
      </FormControl>
    </FormItem>
  </FormField>
</template>
