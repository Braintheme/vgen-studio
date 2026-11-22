import type { ColumnDef } from '@tanstack/vue-table';
import type { ProjectDto } from '@vgen/shared';
import { h } from 'vue';
import { Checkbox } from '@/components/ui/checkbox';
import { formatTime } from '@/lib/days';
import { formatDateTime } from '@/lib/format';
import { projectStatus } from '@/lib/project-status';
import type { CheckState } from '@/lib/render-files';
import ProjectRowActions from './ProjectRowActions.vue';
import ProjectStatusCell from './ProjectStatusCell.vue';
import ProjectSummary from './ProjectSummary.vue';
import ProjectThumbnail from './ProjectThumbnail.vue';

export interface ProjectColumnHandlers {
  readonly templateName: (templateId: string) => string;
  readonly presetName: (presetId: string | null) => string | null;
  readonly timeZone: string;
  readonly busy: () => boolean;
  readonly isSelected: (id: string) => boolean;
  readonly onToggle: (project: ProjectDto) => void;
  readonly pageState: () => CheckState;
  readonly onTogglePage: () => void;
  readonly onRender: (project: ProjectDto) => void;
  readonly onDuplicate: (project: ProjectDto) => void;
  readonly onRemove: (project: ProjectDto) => void;
}

/** Column definitions of the projects table; cells are small presentational components. */
export const createProjectColumns = (handlers: ProjectColumnHandlers): ColumnDef<ProjectDto>[] => [
  {
    id: 'select',
    size: 32,
    header: () =>
      h(Checkbox, {
        modelValue: handlers.pageState(),
        'aria-label': 'Select the page',
        'onUpdate:modelValue': handlers.onTogglePage,
      }),
    cell: ({ row }) =>
      h(Checkbox, {
        modelValue: handlers.isSelected(row.original.id),
        'aria-label': `Select ${row.original.name}`,
        'onUpdate:modelValue': () => {
          handlers.onToggle(row.original);
        },
      }),
  },
  {
    id: 'thumbnail',
    header: '',
    size: 72,
    cell: ({ row }) =>
      h(ProjectThumbnail, { url: row.original.thumbnail?.url ?? null, alt: row.original.name }),
  },
  {
    id: 'project',
    header: 'Project',
    cell: ({ row }) =>
      h(ProjectSummary, {
        id: row.original.id,
        name: row.original.name,
        templateName: handlers.templateName(row.original.templateId),
        presetName: handlers.presetName(row.original.presetId),
      }),
  },
  {
    id: 'status',
    header: 'Status',
    size: 220,
    cell: ({ row }) => h(ProjectStatusCell, { status: projectStatus(row.original, handlers.timeZone) }),
  },
  {
    id: 'created',
    header: 'Created',
    size: 100,
    // The day is in the group header above the row.
    cell: ({ row }) =>
      h(
        'span',
        {
          class: 'text-sm tabular-nums text-muted-foreground',
          title: formatDateTime(row.original.createdAt),
        },
        formatTime(row.original.createdAt),
      ),
  },
  {
    id: 'actions',
    header: '',
    size: 56,
    cell: ({ row }) =>
      h(ProjectRowActions, {
        project: row.original,
        busy: handlers.busy(),
        onRender: handlers.onRender,
        onDuplicate: handlers.onDuplicate,
        onRemove: handlers.onRemove,
      }),
  },
];
