<script setup lang="ts">
import { computed } from 'vue';
import { Slider } from '@/components/ui/slider';

/**
 * A single-value slider whose handle resets to `resetValue` on double-click (like Lightroom).
 * Without a `resetValue` it is a plain slider.
 */
const props = defineProps<{
  min: number;
  max: number;
  step: number;
  resetValue?: number | null;
  ariaLabel?: string;
}>();

const model = defineModel<number>({ required: true });

const resettable = computed(() => props.resetValue !== undefined && props.resetValue !== null);
const title = computed(() => (resettable.value ? 'Double-click the handle to reset' : undefined));

/** Slack around the handle for the double-click, px (it is small). */
const HIT_SLOP = 6;

// The slider captures the pointer, so the event's target may be the root: hit-test the
// handle by position instead.
const onDoubleClick = (event: MouseEvent): void => {
  if (props.resetValue === undefined || props.resetValue === null) return;
  const root = event.currentTarget instanceof Element ? event.currentTarget : null;
  const rect = root?.querySelector('[data-slot="slider-thumb"]')?.getBoundingClientRect();
  if (!rect) return;
  const onHandle =
    event.clientX >= rect.left - HIT_SLOP &&
    event.clientX <= rect.right + HIT_SLOP &&
    event.clientY >= rect.top - HIT_SLOP &&
    event.clientY <= rect.bottom + HIT_SLOP;
  if (onHandle) model.value = props.resetValue;
};
</script>

<template>
  <Slider
    :model-value="[model]"
    :min="min"
    :max="max"
    :step="step"
    :aria-label="ariaLabel"
    :title="title"
    @update:model-value="(next) => next && next[0] !== undefined && (model = next[0])"
    @dblclick="onDoubleClick"
  />
</template>
