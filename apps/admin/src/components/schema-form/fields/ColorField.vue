<script setup lang="ts">
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { FieldOf } from '@/components/schema-form/types';

defineProps<{
  field: FieldOf<'color'>;
}>();
</script>

<template>
  <FormField v-slot="{ value, handleChange }" :name="field.path">
    <FormItem>
      <FormLabel>{{ field.label }}</FormLabel>
      <div class="flex items-center gap-2">
        <input
          type="color"
          class="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
          :aria-label="field.label"
          :value="String(value)"
          @input="handleChange(($event.target as HTMLInputElement).value)"
        />
        <FormControl>
          <Input
            class="font-mono"
            :model-value="String(value)"
            maxlength="7"
            @update:model-value="handleChange"
          />
        </FormControl>
      </div>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
