import type { ColumnDef } from '@tanstack/vue-table';
import type { RenderJobDto } from '@vgen/shared';
import { h } from 'vue';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
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
}

/** Column definitions of the renders table; cells are small presentational components. */
export const createRenderColumns = (handlers: RenderColumnHandlers): ColumnDef<RenderJobDto>[] => [
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
    id: 'video',
    header: 'Video',
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
      ]),
  },
  {
    id: 'created',
    header: 'Created',
    size: 160,
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-sm text-muted-foreground', title: formatDateTime(row.original.createdAt) },
        formatRelativeTime(row.original.createdAt),
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
      }),
  },
];
