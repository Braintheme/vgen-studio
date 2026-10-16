/** The library's type filter ("all" = photos and videos). */
export type LibraryKindFilter = 'all' | 'image' | 'video';

/** Result of counting the unused files before deleting them. */
export interface CleanupPreview {
  readonly count: number;
  readonly sizeLabel: string;
}
