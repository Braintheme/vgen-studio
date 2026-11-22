import { useEventListener } from '@vueuse/core';
import {
  sanitizeMediaRefs,
  sanitizeTemplateSettings,
  type ProjectDto,
  type ProjectLastRender,
  type ProjectNeighborsDto,
  type QualityPreset,
  type StillScale,
  type TemplateDefinition,
  type UpdateProjectRequest,
} from '@vgen/shared';
import { computed, onScopeDispose, readonly, ref, shallowRef, type ComputedRef, type Ref } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { useNotify } from '@/composables/useNotify';
import { localTimeZone } from '@/lib/days';
import { projectStatus, type ProjectStatusView } from '@/lib/project-status';
import { useProjectNeighborsQuery, useProjectQuery, useUpdateProjectMutation } from '@/queries/projects';
import { useRenderLiveSync } from '@/queries/renders';
import type { DraftMedia } from '@/stores/compose-draft';
import { PROJECT_SAVE_DEBOUNCE_MS } from '@/features/compose/constants';
import type { ComposeDraftState } from './useComposeDraft';

/** The project around the editor: its name, saving state and last render. */
export interface ProjectSession {
  readonly id: string;
  readonly name: Readonly<Ref<string>>;
  readonly rename: (name: string) => void;
  /** Changes not on the server yet (pending or being written). */
  readonly saving: Readonly<Ref<boolean>>;
  /** The last save failed; `retry` sends the changes again. */
  readonly failed: Readonly<Ref<boolean>>;
  readonly retry: () => Promise<void>;
  /** Kept current by render events. */
  readonly lastRender: ComputedRef<ProjectLastRender | null>;
  /** "Rendered 14:05", "Rendering 40%"… and whether it was edited since. */
  readonly status: ComputedRef<ProjectStatusView>;
  /** Place in the projects list and the neighbours (Prev / Next); null while loading. */
  readonly neighbors: ComputedRef<ProjectNeighborsDto | null>;
}

export interface ProjectDraftState extends ComposeDraftState {
  readonly session: ProjectSession;
}

const hasChanges = (patch: UpdateProjectRequest): boolean => Object.keys(patch).length > 0;

/**
 * A project as the editor's draft. Opened against the CURRENT template like a browser draft
 * (invalid fields fall back to defaults, with a notice, and the fixed version is saved). Every
 * change is batched for a moment and saved to the server; leaving the page writes what is left.
 */
export const useProjectDraft = (
  template: TemplateDefinition,
  project: ProjectDto,
  report: (line: string) => void,
): ProjectDraftState => {
  const notify = useNotify();
  const update = useUpdateProjectMutation();
  const live = useProjectQuery(project.id);
  const neighbors = useProjectNeighborsQuery(project.id);
  // Render events keep the header's "Rendering 40%" / "Rendered 14:05" current.
  useRenderLiveSync();

  const sanitized = sanitizeTemplateSettings(template, project.settings);
  const media = shallowRef<DraftMedia>(sanitizeMediaRefs(template, project.media));
  const quality = ref<QualityPreset>(project.quality);
  const scale = ref<StillScale>(project.scale);
  const presetId = ref<string | null>(project.presetId);
  const name = ref(project.name);

  const saving = ref(false);
  const failed = ref(false);
  let pending: UpdateProjectRequest = {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> | null = null;
  // A function: `schedule` may set the timer while a save is awaited.
  const waiting = (): boolean => timer !== undefined || hasChanges(pending);

  const send = async (): Promise<void> => {
    clearTimeout(timer);
    timer = undefined;
    if (inFlight) await inFlight;
    const patch = pending;
    pending = {};
    if (hasChanges(patch)) {
      inFlight = update
        .mutateAsync({ id: project.id, patch })
        .then(() => {
          failed.value = false;
        })
        .catch((error: unknown) => {
          // Keep the changes: newer ones win, the rest is sent again with the next save.
          pending = { ...patch, ...pending };
          if (!failed.value) notify.error('Could not save the project', error);
          failed.value = true;
        })
        .finally(() => {
          inFlight = null;
        });
      await inFlight;
    }
    saving.value = waiting();
  };

  const schedule = (patch: UpdateProjectRequest): void => {
    pending = { ...pending, ...patch };
    saving.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void send();
    }, PROJECT_SAVE_DEBOUNCE_MS);
  };

  const flush = async (): Promise<void> => {
    if (waiting()) await send();
    else if (inFlight) await inFlight;
  };

  // The stored project no longer fits the template exactly: say so and save the fixed version.
  if (project.templateVersion !== template.version) {
    const outcome =
      sanitized.resetPaths.length > 0 ? 'settings that no longer fit were reset' : 'your settings still fit';
    report(`The template was updated (v${project.templateVersion} → v${template.version}); ${outcome}.`);
    schedule({ settings: { ...sanitized.value }, media: media.value as UpdateProjectRequest['media'] });
  } else if (sanitized.resetPaths.length > 0) {
    report('Settings that are no longer valid were reset to defaults.');
    schedule({ settings: { ...sanitized.value } });
  }

  onBeforeRouteLeave(flush);
  // Prev / Next stays on the same route (another id): write the pending changes first too.
  onBeforeRouteUpdate(flush);
  // Closing the tab cannot wait for a request: ask the browser to warn instead.
  useEventListener(window, 'beforeunload', (event: BeforeUnloadEvent) => {
    if (saving.value) event.preventDefault();
  });
  onScopeDispose(() => {
    if (waiting()) void send();
  });

  const writable = <T>(source: Ref<T>, key: 'quality' | 'scale' | 'presetId') =>
    computed<T>({
      get: () => source.value,
      set: (value) => {
        source.value = value;
        schedule({ [key]: value });
      },
    });

  return {
    initialSettings: sanitized.value,
    isFresh: false,
    media: computed(() => media.value),
    quality: writable(quality, 'quality'),
    scale: writable(scale, 'scale'),
    presetId: writable(presetId, 'presetId'),
    saveSettings: (next) => {
      schedule({ settings: { ...next } });
    },
    setMedia: (next) => {
      media.value = next;
      schedule({ media: next as UpdateProjectRequest['media'] });
    },
    // Form edits go straight to the batch above.
    settingsDebounceMs: 0,
    flush,
    session: {
      id: project.id,
      name: readonly(name),
      rename: (next) => {
        const trimmed = next.trim();
        if (!trimmed || trimmed === name.value) return;
        name.value = trimmed;
        schedule({ name: trimmed });
      },
      saving: readonly(saving),
      failed: readonly(failed),
      retry: send,
      lastRender: computed(() => live.data.value?.lastRender ?? project.lastRender),
      neighbors: computed(() => neighbors.data.value ?? null),
      status: computed(() =>
        projectStatus(
          {
            lastRender: live.data.value?.lastRender ?? project.lastRender,
            updatedAt: live.data.value?.updatedAt ?? project.updatedAt,
          },
          localTimeZone(),
        ),
      ),
    },
  };
};
