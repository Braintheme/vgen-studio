import type { ColumnDef } from '@tanstack/vue-table';
import type { StylePresetDto } from '@vgen/shared';
import { h } from 'vue';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/format';
import PresetRowActions from './PresetRowActions.vue';

export interface PresetColumnHandlers {
  /** Current version of the template (null when the template is not installed). */
  readonly templateVersion: string | null;
  readonly isBusy: (id: string) => boolean;
  readonly isTrackMissing: (id: string) => boolean;
  readonly onOpen: (preset: StylePresetDto) => void;
  readonly onRename: (preset: StylePresetDto) => void;
  readonly onMakeDefault: (preset: StylePresetDto) => void;
  readonly onRemove: (preset: StylePresetDto) => void;
}

export const createPresetColumns = (handlers: PresetColumnHandlers): ColumnDef<StylePresetDto>[] => [
  {
    id: 'name',
    header: 'Preset',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'font-medium' }, row.original.name),
        row.original.isDefault ? h(Badge, { variant: 'secondary' }, () => 'Default') : null,
        handlers.isTrackMissing(row.original.id)
          ? h(
              Badge,
              {
                variant: 'outline',
                title: 'Its music track was deleted; the library default plays instead.',
              },
              () => 'Track deleted',
            )
          : null,
      ]),
  },
  {
    id: 'version',
    header: 'Template version',
    size: 170,
    cell: ({ row }) => {
      const outdated =
        handlers.templateVersion !== null && row.original.templateVersion !== handlers.templateVersion;
      return h('span', { class: 'flex items-center gap-2 text-sm text-muted-foreground' }, [
        `v${row.original.templateVersion}`,
        outdated ? h(Badge, { variant: 'outline' }, () => `now v${handlers.templateVersion ?? ''}`) : null,
      ]);
    },
  },
  {
    id: 'updated',
    header: 'Updated',
    size: 160,
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-muted-foreground' }, formatRelativeTime(row.original.updatedAt)),
  },
  {
    id: 'actions',
    header: '',
    size: 200,
    cell: ({ row }) =>
      h(PresetRowActions, {
        preset: row.original,
        busy: handlers.isBusy(row.original.id),
        onOpen: handlers.onOpen,
        onRename: handlers.onRename,
        onMakeDefault: handlers.onMakeDefault,
        onRemove: handlers.onRemove,
      }),
  },
];
