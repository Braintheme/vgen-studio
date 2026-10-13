<script setup lang="ts">
import { ArrowRight, LayoutTemplate } from '@lucide/vue';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { TemplateCardView } from '@/features/templates/types';

defineProps<{
  card: TemplateCardView;
}>();
</script>

<template>
  <RouterLink
    :to="card.to"
    class="group rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
  >
    <Card class="h-full gap-0 overflow-hidden py-0 transition-shadow group-hover:shadow-md">
      <div
        class="relative flex aspect-video items-center justify-center bg-gradient-to-br from-muted to-muted/40"
      >
        <img
          v-if="card.thumbnailUrl"
          :src="card.thumbnailUrl"
          :alt="card.name"
          class="size-full object-cover"
        />
        <LayoutTemplate v-else class="size-10 text-muted-foreground" />
        <Badge variant="secondary" class="absolute top-3 left-3">{{ card.engineName }}</Badge>
      </div>
      <CardContent class="grid gap-3 p-4">
        <div class="space-y-1">
          <h2 class="flex items-center justify-between font-semibold">
            {{ card.name }}
            <ArrowRight
              class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            />
          </h2>
          <p class="line-clamp-2 text-sm text-muted-foreground">{{ card.description }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{{ card.mediaSummary }}</span>
          <span aria-hidden="true">·</span>
          <Badge v-for="format in card.formats" :key="format" variant="outline">{{ format }}</Badge>
        </div>
      </CardContent>
    </Card>
  </RouterLink>
</template>
