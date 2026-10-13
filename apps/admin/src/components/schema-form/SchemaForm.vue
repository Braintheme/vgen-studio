<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FormSectionSpec } from '@/lib/schema-form';
import SchemaField from './SchemaField.vue';
import { widgetSlotName, type CustomFieldSpec, type WidgetSlotName } from './types';

/**
 * Renders a form from section/field specs (see lib/schema-form.ts). Must be used under a
 * vee-validate form (useSchemaForm in the screen's composable); fields bind by path.
 * Custom widgets are filled by the screen through `widget:<id>` slots; a custom field
 * without a slot is not shown.
 */
defineProps<{
  sections: readonly FormSectionSpec[];
}>();

defineSlots<Partial<Record<WidgetSlotName, (props: { field: CustomFieldSpec }) => unknown>>>();
</script>

<template>
  <div class="grid gap-4">
    <Card v-for="section in sections" :key="section.id" class="gap-4 py-4">
      <CardHeader class="px-4">
        <CardTitle class="text-sm">{{ section.title }}</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-4 px-4">
        <template v-for="field in section.fields" :key="field.path">
          <slot v-if="field.kind === 'custom'" :name="widgetSlotName(field.widget)" :field="field" />
          <SchemaField v-else :field="field" />
        </template>
      </CardContent>
    </Card>
  </div>
</template>
