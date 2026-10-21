<script setup lang="ts">
import type { Component } from 'vue';
import type { GenericFieldSpec } from './types';
import ChoiceSelectField from './fields/ChoiceSelectField.vue';
import ColorField from './fields/ColorField.vue';
import NumberField from './fields/NumberField.vue';
import SegmentedField from './fields/SegmentedField.vue';
import SliderField from './fields/SliderField.vue';
import StringField from './fields/StringField.vue';
import SwitchField from './fields/SwitchField.vue';
import TextToggleField from './fields/TextToggleField.vue';
import ColumnsField from './fields/ColumnsField.vue';
import PopoverField from './fields/PopoverField.vue';

defineProps<{
  field: GenericFieldSpec;
}>();

/**
 * Widget registry: one component per generic field kind (custom ones come from slots).
 * `columns` and `popover` lay out other fields and render them through this component (below).
 */
const FIELD_COMPONENTS: Record<Exclude<GenericFieldSpec['kind'], 'columns' | 'popover'>, Component> = {
  select: ChoiceSelectField,
  font: ChoiceSelectField,
  segmented: SegmentedField,
  switch: SwitchField,
  slider: SliderField,
  number: NumberField,
  color: ColorField,
  text: TextToggleField,
  string: StringField,
};
</script>

<template>
  <ColumnsField v-if="field.kind === 'columns'" :field="field">
    <template #cell="{ field: cell }">
      <SchemaField v-if="cell.kind !== 'custom'" :field="cell" />
    </template>
  </ColumnsField>
  <PopoverField v-else-if="field.kind === 'popover'" :field="field">
    <template #cell="{ field: cell }">
      <SchemaField v-if="cell.kind !== 'custom'" :field="cell" />
    </template>
  </PopoverField>
  <component :is="FIELD_COMPONENTS[field.kind]" v-else :field="field" />
</template>
