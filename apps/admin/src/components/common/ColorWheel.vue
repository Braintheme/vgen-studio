<script setup lang="ts">
import { computed, ref } from 'vue';
import type { WheelValue } from '@/lib/ui-types';

const props = defineProps<{
  label: string;
  /** Diameter, px. */
  size?: number;
}>();

const model = defineModel<WheelValue>({ required: true });

const diameter = computed(() => props.size ?? 112);
const wheel = ref<HTMLElement | null>(null);
const dragging = ref(false);

const puck = computed(() => {
  const radius = (model.value.amount / 100) * (diameter.value / 2);
  const angle = (model.value.hue * Math.PI) / 180;
  return {
    x: diameter.value / 2 + radius * Math.sin(angle),
    y: diameter.value / 2 - radius * Math.cos(angle),
  };
});

const pick = (event: PointerEvent): void => {
  const rect = wheel.value?.getBoundingClientRect();
  if (!rect) return;
  const dx = event.clientX - (rect.left + rect.width / 2);
  const dy = event.clientY - (rect.top + rect.height / 2);
  const hue = Math.round(((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360);
  const amount = Math.round(Math.min(1, Math.hypot(dx, dy) / (rect.width / 2)) * 100);
  model.value = { hue, amount };
};

const onDown = (event: PointerEvent): void => {
  dragging.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  pick(event);
};
const onMove = (event: PointerEvent): void => {
  if (dragging.value) pick(event);
};
const onUp = (): void => {
  dragging.value = false;
};
/** Double-click: no tint (back to the default), like the sliders. */
const reset = (): void => {
  model.value = { hue: model.value.hue, amount: 0 };
};
</script>

<template>
  <div class="flex flex-col items-center gap-1.5">
    <div
      ref="wheel"
      role="slider"
      :aria-label="label"
      :aria-valuenow="model.amount"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuetext="`${model.hue}°, ${model.amount}%`"
      title="Drag to tint; double-click to reset"
      class="relative cursor-crosshair touch-none rounded-full shadow-inner ring-1 ring-border select-none"
      :style="{
        width: `${diameter}px`,
        height: `${diameter}px`,
        background:
          'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 72%), conic-gradient(from 0deg, hsl(0 85% 55%), hsl(60 85% 55%), hsl(120 85% 55%), hsl(180 85% 55%), hsl(240 85% 55%), hsl(300 85% 55%), hsl(360 85% 55%))',
      }"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @dblclick="reset"
    >
      <span
        class="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/30 shadow"
        :style="{ left: `${puck.x}px`, top: `${puck.y}px` }"
      />
    </div>
    <span class="text-xs font-medium">{{ label }}</span>
    <span class="text-[11px] tabular-nums text-muted-foreground">{{ model.hue }}° · {{ model.amount }}</span>
  </div>
</template>
