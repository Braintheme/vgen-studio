<script setup lang="ts">
import { SlidersHorizontal } from '@lucide/vue';
import { useFormValues } from 'vee-validate';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { summarizeFields, type FieldSpec } from '@/lib/schema-form';
import type { FieldOf } from '@/components/schema-form/types';

/**
 * A group of fields as one compact row (label, a summary of the values, colour swatches) that
 * opens a popover with the fields themselves, like a site builder's typography control. The
 * fields come from the parent (`cell` slot) and render with the regular widgets.
 */
const props = defineProps<{
  field: FieldOf<'popover'>;
}>();

defineSlots<{ cell: (props: { field: FieldSpec }) => unknown }>();

const values = useFormValues();
const summary = computed(() => summarizeFields(props.field.fields, values.value));
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <!-- A plain label: FormLabel only works inside a FormField. -->
    <span class="text-sm font-medium">{{ field.label }}</span>
    <Popover>
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          size="sm"
          class="h-8 min-w-0 max-w-[70%] gap-2 font-normal"
          :aria-label="`Edit ${field.label.toLowerCase()}`"
        >
          <span
            v-for="(color, index) in summary.colors"
            :key="index"
            class="size-3.5 shrink-0 rounded-full border"
            :style="{ backgroundColor: color }"
          />
          <span v-if="summary.text" class="truncate text-muted-foreground">{{ summary.text }}</span>
          <SlidersHorizontal class="size-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" class="grid max-h-[70vh] w-80 gap-4 overflow-y-auto">
        <p class="text-sm font-semibold">{{ field.label }}</p>
        <template v-for="child in field.fields" :key="child.path">
          <slot name="cell" :field="child" />
        </template>
      </PopoverContent>
    </Popover>
  </div>
</template>
