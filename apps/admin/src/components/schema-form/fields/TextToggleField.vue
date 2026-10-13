<script setup lang="ts">
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { FieldOf } from '@/components/schema-form/types';

defineProps<{
  field: FieldOf<'text'>;
}>();
</script>

<template>
  <div class="grid gap-2">
    <FormField v-slot="{ value: enabled, handleChange: setEnabled }" :name="`${field.path}.enabled`">
      <FormItem class="flex items-center justify-between gap-4">
        <FormLabel>{{ field.label }}</FormLabel>
        <FormControl>
          <Switch
            :model-value="enabled === true"
            :aria-label="`Show ${field.label}`"
            @update:model-value="setEnabled"
          />
        </FormControl>
      </FormItem>
      <FormField v-slot="{ value, handleChange }" :name="`${field.path}.value`">
        <FormItem>
          <FormControl>
            <component
              :is="field.multiline ? Textarea : Input"
              :model-value="String(value ?? '')"
              :disabled="enabled !== true"
              :maxlength="field.maxLength ?? undefined"
              @update:model-value="handleChange"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </FormField>
  </div>
</template>
