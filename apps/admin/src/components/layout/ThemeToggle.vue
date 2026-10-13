<script setup lang="ts">
import { Monitor, Moon, Sun } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Mode = 'light' | 'dark' | 'auto';

const mode = defineModel<Mode>({ required: true });

const OPTIONS: readonly { value: Mode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'System' },
];

const onSelect = (value: unknown): void => {
  const option = OPTIONS.find((candidate) => candidate.value === value);
  if (option) mode.value = option.value;
};
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="size-8" aria-label="Theme">
        <Sun v-if="mode === 'light'" />
        <Moon v-else-if="mode === 'dark'" />
        <Monitor v-else />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuRadioGroup :model-value="mode" @update:model-value="onSelect">
        <DropdownMenuRadioItem v-for="option in OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
