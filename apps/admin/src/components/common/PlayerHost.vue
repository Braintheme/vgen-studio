<script setup lang="ts">
import type { PlayerAdapter, PlayerHandle, PlayerInput } from '@vgen/shared';
import { onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue';

/**
 * Hosts an engine's preview player (e.g. a React island for Remotion). Only manages the
 * DOM lifecycle: mount when both adapter and input exist, update on input changes,
 * destroy on unmount or adapter change.
 */
const props = defineProps<{
  adapter: PlayerAdapter<HTMLElement> | null;
  input: PlayerInput | null;
}>();

const container = useTemplateRef<HTMLDivElement>('container');
const handle = shallowRef<PlayerHandle | null>(null);

const destroy = (): void => {
  handle.value?.destroy();
  handle.value = null;
};

watch(
  () => [props.adapter, container.value] as const,
  ([adapter, element]) => {
    destroy();
    if (adapter && element && props.input) {
      handle.value = adapter.mount(element, props.input);
    }
  },
  { flush: 'post' },
);

watch(
  () => props.input,
  (input) => {
    if (!input) return;
    if (handle.value) {
      handle.value.update(input);
    } else if (props.adapter && container.value) {
      handle.value = props.adapter.mount(container.value, input);
    }
  },
);

onBeforeUnmount(destroy);
</script>

<template>
  <div ref="container" class="w-full overflow-hidden rounded-lg bg-black" />
</template>
