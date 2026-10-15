<script setup lang="ts">
import { ChevronDown } from '@lucide/vue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { FormSectionSpec } from '@/lib/schema-form';
import SchemaField from './SchemaField.vue';
import { widgetSlotName, type CustomFieldSpec, type WidgetSlotName } from './types';

/**
 * Renders a form from section/field specs (see lib/schema-form.ts). Must be used under a
 * vee-validate form (useSchemaForm in the screen's composable); fields bind by path.
 * Custom widgets are filled by the screen through `widget:<id>` slots; a custom field
 * without a slot is not shown. Sections fold; folded fields stay mounted (only hidden), so
 * their values stay in the form.
 */
defineProps<{
  sections: readonly FormSectionSpec[];
}>();

/** Ids of the folded sections. */
const collapsed = defineModel<readonly string[]>('collapsed', { default: () => [] });

defineSlots<Partial<Record<WidgetSlotName, (props: { field: CustomFieldSpec }) => unknown>>>();

const setOpen = (id: string, open: boolean): void => {
  const rest = collapsed.value.filter((value) => value !== id);
  collapsed.value = open ? rest : [...rest, id];
};
</script>

<template>
  <div class="grid gap-4">
    <Collapsible
      v-for="section in sections"
      :key="section.id"
      :open="!collapsed.includes(section.id)"
      :unmount-on-hide="false"
      as-child
      @update:open="(open: boolean) => setOpen(section.id, open)"
    >
      <Card class="gap-0 py-0">
        <CardHeader class="px-0">
          <CollapsibleTrigger
            class="group flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left"
          >
            <CardTitle class="text-sm">{{ section.title }}</CardTitle>
            <ChevronDown
              class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=closed]:-rotate-90"
            />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent class="grid gap-4 px-4 pt-1 pb-4">
            <template v-for="field in section.fields" :key="field.path">
              <slot v-if="field.kind === 'custom'" :name="widgetSlotName(field.widget)" :field="field" />
              <SchemaField v-else :field="field" />
            </template>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  </div>
</template>
