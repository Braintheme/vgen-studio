<script setup lang="ts">
import { CircleCheck } from '@lucide/vue';
import { computed } from 'vue';
import { dayKey, dayLabel, formatTime, localTimeZone } from '@/lib/days';
import { formatDateTime } from '@/lib/format';

/** "Downloaded 14:05" (today) or "Downloaded Fri, 21 Nov" under a render's status. */
const props = defineProps<{ downloadedAt: string }>();

const when = computed(() => {
  const zone = localTimeZone();
  const key = dayKey(props.downloadedAt, zone);
  const today = dayKey(new Date(), zone);
  return key === today ? formatTime(props.downloadedAt) : dayLabel(key, today).date;
});
</script>

<template>
  <span
    class="inline-flex items-center gap-1 text-xs text-muted-foreground"
    :title="`Downloaded ${formatDateTime(downloadedAt)}`"
  >
    <CircleCheck class="size-3.5 text-emerald-600 dark:text-emerald-500" /> Downloaded {{ when }}
  </span>
</template>
