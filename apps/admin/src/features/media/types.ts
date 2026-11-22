/** The library's view: files by type ("all" = photos and videos), or its groups. */
export type LibraryKindFilter = 'all' | 'image' | 'video' | 'groups';

/** Result of counting the unused files before deleting them. */
export interface CleanupPreview {
  readonly count: number;
  readonly sizeLabel: string;
}
