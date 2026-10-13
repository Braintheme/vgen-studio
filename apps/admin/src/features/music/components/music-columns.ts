import type { ColumnDef } from '@tanstack/vue-table';
import type { MusicTrackDto } from '@vgen/shared';
import { h } from 'vue';
import { Badge } from '@/components/ui/badge';
import { formatDuration, formatRelativeTime } from '@/lib/format';
import TrackPlayButton from './TrackPlayButton.vue';
import TrackRowActions from './TrackRowActions.vue';

export interface MusicColumnHandlers {
  readonly isPlaying: (id: string) => boolean;
  readonly isBusy: (id: string) => boolean;
  readonly onTogglePlay: (track: MusicTrackDto) => void;
  readonly onRename: (track: MusicTrackDto) => void;
  readonly onMakeDefault: (track: MusicTrackDto) => void;
  readonly onRemove: (track: MusicTrackDto) => void;
}

export const createMusicColumns = (handlers: MusicColumnHandlers): ColumnDef<MusicTrackDto>[] => [
  {
    id: 'play',
    header: '',
    size: 56,
    cell: ({ row }) =>
      h(TrackPlayButton, {
        playing: handlers.isPlaying(row.original.id),
        title: row.original.title,
        onToggle: () => {
          handlers.onTogglePlay(row.original);
        },
      }),
  },
  {
    id: 'title',
    header: 'Track',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'font-medium' }, row.original.title),
        row.original.isDefault ? h(Badge, { variant: 'secondary' }, () => 'Default') : null,
      ]),
  },
  {
    id: 'duration',
    header: 'Length',
    size: 110,
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums text-muted-foreground' }, formatDuration(row.original.durationSec)),
  },
  {
    id: 'added',
    header: 'Added',
    size: 160,
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-muted-foreground' }, formatRelativeTime(row.original.createdAt)),
  },
  {
    id: 'actions',
    header: '',
    size: 56,
    cell: ({ row }) =>
      h(TrackRowActions, {
        track: row.original,
        busy: handlers.isBusy(row.original.id),
        onRename: handlers.onRename,
        onMakeDefault: handlers.onMakeDefault,
        onRemove: handlers.onRemove,
      }),
  },
];
