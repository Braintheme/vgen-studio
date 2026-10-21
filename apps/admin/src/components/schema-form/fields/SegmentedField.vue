<script setup lang="ts">
import { computed } from 'vue';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { OPTION_ICONS } from '@/components/schema-form/option-icons';
import type { FieldOf } from '@/components/schema-form/types';

const props = defineProps<{
  field: FieldOf<'segmented'>;
}>();

const toValue = (raw: unknown): string | number | undefined =>
  props.field.options.find((option) => String(option.value) === String(raw))?.value;

/** Options with icons render as tiles: a large icon above the label. */
const withIcons = computed(() => props.field.options.some((option) => option.icon !== null));
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
          :spacing="withIcons ? 2 : 0"
          :model-value="String(value)"
          @update:model-value="(raw) => raw && handleChange(toValue(raw))"
        >
          <ToggleGroupItem
            v-for="option in field.options"
            :key="String(option.value)"
            :value="String(option.value)"
            class="flex-1"
            :class="
              withIcons &&
              'h-auto flex-col gap-1.5 rounded-md py-3 data-[state=on]:border-primary data-[state=on]:text-foreground'
            "
          >
            <component
              :is="OPTION_ICONS[option.icon]"
              v-if="option.icon && OPTION_ICONS[option.icon]"
              class="size-6"
              :stroke-width="1.5"
            />
            {{ option.label }}
          </ToggleGroupItem>
        </ToggleGroup>
      </FormControl>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
