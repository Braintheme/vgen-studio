<script setup lang="ts">
import { LayoutTemplate } from '@lucide/vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ErrorState from '@/components/common/ErrorState.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import { Skeleton } from '@/components/ui/skeleton';
import TemplateCard from '@/features/templates/components/TemplateCard.vue';
import { useTemplateGallery } from '@/features/templates/composables/useTemplateGallery';

const { cards, isLoading, error, retry } = useTemplateGallery();

const SKELETON_CARDS = 3;
</script>

<template>
  <PageHeader title="Templates" description="Pick a template to create a video." />
  <ErrorState v-if="error" title="Could not load templates" :message="error.message" @retry="retry" />
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <template v-if="isLoading">
      <Skeleton v-for="index in SKELETON_CARDS" :key="index" class="aspect-[4/3] rounded-xl" />
    </template>
    <TemplateCard v-for="card in cards" v-else :key="card.id" :card="card" />
  </div>
  <EmptyState
    v-if="!isLoading && !error && cards.length === 0"
    :icon="LayoutTemplate"
    title="No templates installed"
    description="Templates come from the installed render engines."
  />
</template>
