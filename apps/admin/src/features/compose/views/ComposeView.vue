<script setup lang="ts">
import { LayoutTemplate } from '@lucide/vue';
import EmptyState from '@/components/common/EmptyState.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import ComposeSettingsForm from '@/features/compose/components/ComposeSettingsForm.vue';
import MediaPickerDialog from '@/features/compose/components/MediaPickerDialog.vue';
import MediaSlotsPanel from '@/features/compose/components/MediaSlotsPanel.vue';
import PresetBar from '@/features/compose/components/PresetBar.vue';
import PreviewPanel from '@/features/compose/components/PreviewPanel.vue';
import { useComposeScreen } from '@/features/compose/composables/useComposeScreen';

const screen = useComposeScreen();
</script>

<template>
  <EmptyState
    v-if="screen.status === 'missing'"
    :icon="LayoutTemplate"
    title="Template not found"
    :description="`There is no template “${screen.templateId}”. Pick one from the gallery.`"
  />
  <template v-else>
    <PageHeader :title="screen.template.name" :description="screen.template.description" />
    <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div class="grid gap-4">
        <MediaSlotsPanel
          :slots="screen.media.slots.value"
          :actions="screen.media.actions.value"
          :warnings="screen.media.warnings.value"
          @upload="screen.media.upload"
          @clear="screen.media.clear"
          @browse="screen.picker.openFor"
          @remove="screen.media.removeAt"
          @move="screen.media.move"
          @sort="screen.media.sortByName"
          @swap="screen.media.swapInGroup"
          @action="screen.media.runAction"
        />
        <PresetBar
          :presets="screen.presets.presets.value"
          :selected-id="screen.presets.selectedId.value"
          :modified="screen.presets.modified.value"
          :busy="screen.presets.busy.value"
          @select="screen.presets.select"
          @save="screen.presets.saveAsNew"
          @update="screen.presets.updateSelected"
        />
        <ComposeSettingsForm
          v-model:track-id="screen.music.trackId.value"
          v-model:start-sec="screen.music.startSec.value"
          v-model:collapsed="screen.collapsedSections.value"
          :sections="screen.sections.value"
          :music="screen.music.view.value"
          :video-sources="screen.videoSources.value"
        />
      </div>
      <div class="lg:sticky lg:top-4">
        <PreviewPanel
          v-model:quality="screen.quality.value"
          v-model:scale="screen.scale.value"
          :adapter="screen.player.value"
          :player-unavailable="screen.playerUnavailable.value"
          :input="screen.preview.value"
          :poster="screen.poster.value"
          :summary="screen.summary.value"
          :generating="screen.generating.value"
          @generate="screen.generate"
        />
      </div>
    </div>
    <MediaPickerDialog
      v-model:open="screen.picker.open.value"
      v-model:page="screen.picker.page.value"
      :target="screen.picker.slot.value"
      :tiles="screen.picker.tiles.value"
      :total="screen.picker.total.value"
      :page-size="screen.picker.pageSize"
      :loading="screen.picker.isLoading.value"
      :selected-count="screen.picker.selectedCount.value"
      @toggle="screen.picker.toggle"
      @confirm="screen.picker.confirm"
    />
  </template>
</template>
