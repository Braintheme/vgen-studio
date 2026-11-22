<script setup lang="ts">
import type { ProjectDto, TemplateDefinition } from '@vgen/shared';
import PageHeader from '@/components/common/PageHeader.vue';
import ComposeSettingsForm from '@/features/compose/components/ComposeSettingsForm.vue';
import MediaPickerDialog from '@/features/compose/components/MediaPickerDialog.vue';
import MediaSlotsPanel from '@/features/compose/components/MediaSlotsPanel.vue';
import PresetBar from '@/features/compose/components/PresetBar.vue';
import PreviewPanel from '@/features/compose/components/PreviewPanel.vue';
import ProjectEditorHeader from '@/features/compose/components/ProjectEditorHeader.vue';
import { useComposeScreen } from '@/features/compose/composables/useComposeScreen';

/**
 * The editor itself, shared by the quick flow (the template's browser draft) and projects.
 * Built once per template / project: parents key it, so its props are read at setup only.
 */
const props = defineProps<{
  template: TemplateDefinition;
  /** Null: the quick flow. */
  project: ProjectDto | null;
}>();

const screen = useComposeScreen(props.template, props.project);
</script>

<template>
  <ProjectEditorHeader
    v-if="screen.project"
    :name="screen.project.name.value"
    :template-name="screen.template.name"
    :status="screen.project.status.value"
    :saving="screen.project.saving.value"
    :failed="screen.project.failed.value"
    :neighbors="screen.project.neighbors.value"
    @rename="screen.project.rename"
    @retry="screen.project.retry"
  />
  <PageHeader v-else :title="screen.template.name" :description="screen.template.description" />
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
    :target="screen.picker.slot.value"
    :tiles="screen.picker.tiles.value"
    :total="screen.picker.total.value"
    :has-more="screen.picker.hasMore.value"
    :loading="screen.picker.isLoading.value"
    :loading-more="screen.picker.isLoadingMore.value"
    :selected-count="screen.picker.selectedCount.value"
    :groups="screen.picker.groups.value"
    :group-note="screen.picker.groupNote.value"
    @toggle="screen.picker.toggle"
    @select-group="screen.picker.selectGroup"
    @load-more="screen.picker.loadMore"
    @confirm="screen.picker.confirm"
  />
</template>
