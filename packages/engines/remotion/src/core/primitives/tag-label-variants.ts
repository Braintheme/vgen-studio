// Pure (isomorphic): manifests list the variants without importing the component.

/** plate: a filled box; outline: a thin frame; glass: frosted; text: no box. */
export const TAG_LABEL_VARIANTS = ['plate', 'outline', 'glass', 'text'] as const;
export type TagLabelVariant = (typeof TAG_LABEL_VARIANTS)[number];
