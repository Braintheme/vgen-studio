import type { ColumnDef } from '@tanstack/vue-table';
import type { RenderJobDto } from '@vgen/shared';
import { h } from 'vue';
import { Checkbox } from '@/components/ui/checkbox';
import { formatTime } from '@/lib/days';
import { formatDateTime } from '@/lib/format';
import { isSavable, type CheckState } from '@/lib/render-files';
import RenderDownloadedMark from './RenderDownloadedMark.vue';
import RenderProgress from './RenderProgress.vue';
import RenderRowActions from './RenderRowActions.vue';
import RenderStatusBadge from './RenderStatusBadge.vue';
import RenderSummary from './RenderSummary.vue';
import RenderThumbnail from './RenderThumbnail.vue';

export interface RenderColumnHandlers {
  readonly templateName: (templateId: string) => string;
  readonly isBusy: (id: string) => boolean;
  readonly onCancel: (render: RenderJobDto) => void;
  readonly onRemove: (render: RenderJobDto) => void;
  readonly onDuplicate: (render: RenderJobDto) => void;
  readonly onShowError: (render: RenderJobDto) => void;
  readonly onShowSlides: (render: RenderJobDto) => void;
  readonly onDownloaded: (render: RenderJobDto) => void;
  readonly isSelected: (id: string) => boolean;
  readonly onToggle: (render: RenderJobDto) => void;
  readonly pageState: () => CheckState;
  readonly onTogglePage: () => void;
}

/** Column definitions of the renders table; cells are small presentational components. */
export const createRenderColumns = (handlers: RenderColumnHandlers): ColumnDef<RenderJobDto>[] => [
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
      isSavable(row.original)
        ? h(Checkbox, {
            modelValue: handlers.isSelected(row.original.id),
            'aria-label': `Select ${row.original.outputName}`,
            'onUpdate:modelValue': () => {
              handlers.onToggle(row.original);
            },
          })
        : null,
  },
  {
    id: 'thumbnail',
    header: '',
    size: 72,
    cell: ({ row }) =>
      h(RenderThumbnail, {
        url: row.original.thumbnail?.url ?? null,
        format: row.original.format,
        alt: row.original.outputName,
      }),
  },
  {
    id: 'output',
    header: 'Output',
    cell: ({ row }) =>
      h(RenderSummary, {
        render: row.original,
        templateName: handlers.templateName(row.original.templateId),
      }),
  },
  {
    id: 'status',
    header: 'Status',
    size: 220,
    cell: ({ row }) =>
      h('div', { class: 'flex flex-col items-start gap-1.5' }, [
        h(RenderStatusBadge, { status: row.original.status }),
        h(RenderProgress, { status: row.original.status, progress: row.original.progress }),
        row.original.downloadedAt
          ? h(RenderDownloadedMark, { downloadedAt: row.original.downloadedAt })
          : null,
      ]),
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
      h(RenderRowActions, {
        render: row.original,
        busy: handlers.isBusy(row.original.id),
        onCancel: handlers.onCancel,
        onRemove: handlers.onRemove,
        onDuplicate: handlers.onDuplicate,
        onShowError: handlers.onShowError,
        onShowSlides: handlers.onShowSlides,
        onDownloaded: handlers.onDownloaded,
      }),
  },
];
