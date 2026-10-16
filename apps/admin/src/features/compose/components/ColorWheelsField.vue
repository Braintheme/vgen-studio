<script setup lang="ts">
import ColorWheel from '@/components/common/ColorWheel.vue';
import type { CustomFieldSpec } from '@/components/schema-form/types';
import { FormField } from '@/components/ui/form';
import type { WheelValue } from '@/lib/ui-types';

/** Shadows / midtones / highlights colour wheels of a clip grade, side by side. */
defineProps<{
  field: CustomFieldSpec;
}>();

const ZONES = [
  { key: 'shadows', label: 'Shadows' },
  { key: 'midtones', label: 'Midtones' },
  { key: 'highlights', label: 'Highlights' },
] as const;

const toWheel = (value: unknown): WheelValue => {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Partial<WheelValue>;
  return {
    hue: typeof raw.hue === 'number' ? raw.hue : 0,
    amount: typeof raw.amount === 'number' ? raw.amount : 0,
  };
};
</script>

<template>
  <!-- A plain label: the wheels are three fields, so no single FormField wraps them. -->
  <div class="grid gap-2">
    <span class="text-sm font-medium">{{ field.label }}</span>
    <div class="grid grid-cols-3 gap-2">
      <FormField
        v-for="zone in ZONES"
        :key="zone.key"
        v-slot="{ value, handleChange }"
        :name="`${field.path}.${zone.key}`"
      >
        <ColorWheel
          :label="zone.label"
          :size="96"
          :model-value="toWheel(value)"
          @update:model-value="handleChange"
        />
      </FormField>
    </div>
  </div>
</template>
