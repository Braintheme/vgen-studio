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

defineProps<{
  field: GenericFieldSpec;
}>();

/** Widget registry: one component per generic field kind (custom ones come from slots). */
const FIELD_COMPONENTS: Record<GenericFieldSpec['kind'], Component> = {
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
  <component :is="FIELD_COMPONENTS[field.kind]" :field="field" />
</template>
