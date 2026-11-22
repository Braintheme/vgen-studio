import { z } from 'zod';
import { DEFAULT_STILL_SCALE, QualityPresetSchema, StillScaleSchema } from '../render/quality.js';
import { RenderStatusSchema } from '../render/status.js';
import { PageQuerySchema } from './pagination.js';
import { DayKeySchema, READY_RENDERS_LIMIT, RenderFileDtoSchema, TimeZoneSchema } from './renders.js';

/** Slot key -> asset id(s); `null` = empty slot. What a compose draft holds. */
export const ProjectMediaSchema = z.record(z.string(), z.union([z.uuid(), z.array(z.uuid()), z.null()]));

/** The editable content of a project: exactly what the editor's draft holds. */
export const ProjectDraftSchema = z.object({
  /** Raw form values (may be incomplete; validated when a render starts). */
  settings: z.record(z.string(), z.unknown()),
  media: ProjectMediaSchema,
  quality: QualityPresetSchema,
  scale: StillScaleSchema,
  /** Style preset the settings came from (names the output file; "Update preset"). */
  presetId: z.uuid().nullable(),
});
export type ProjectDraft = z.infer<typeof ProjectDraftSchema>;

export const ProjectLastRenderSchema = z.object({
  id: z.uuid(),
  status: RenderStatusSchema,
  progress: z.number().int().min(0).max(100),
  error: z.string().nullable(),
  createdAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
});
export type ProjectLastRender = z.infer<typeof ProjectLastRenderSchema>;

/** One future video: a template, its settings and media, rendered when the owner says so. */
export const ProjectDtoSchema = ProjectDraftSchema.extend({
  id: z.uuid(),
  name: z.string(),
  templateId: z.string(),
  /** Template version the settings were last saved with. */
  templateVersion: z.string(),
  /** First photo of the project, else its clip's poster. */
  thumbnail: RenderFileDtoSchema.nullable(),
  /** Newest render made from the project. */
  lastRender: ProjectLastRenderSchema.nullable(),
  createdAt: z.iso.datetime(),
  /** Moves on every content change ("edited since the last render"). */
  updatedAt: z.iso.datetime(),
});
export type ProjectDto = z.infer<typeof ProjectDtoSchema>;

const NameSchema = z.string().trim().min(1).max(256);

export const CreateProjectRequestSchema = z
  .object({
    /** The template; optional when a preset is given (its template is used). */
    templateId: z.string().optional(),
    /** Style preset to start from; without one, the template's default preset applies. */
    presetId: z.uuid().optional(),
    /** Defaults to the preset's or the template's name. */
    name: NameSchema.optional(),
    /** Settings on top of the defaults and the preset (titles, music track, clip range…). */
    settings: z.record(z.string(), z.unknown()).optional(),
    media: ProjectMediaSchema.optional(),
    quality: QualityPresetSchema.default('social'),
    scale: StillScaleSchema.default(DEFAULT_STILL_SCALE),
  })
  .refine((value) => value.templateId !== undefined || value.presetId !== undefined, {
    message: 'Give a template or a preset',
    path: ['templateId'],
  });
export type CreateProjectRequest = z.input<typeof CreateProjectRequestSchema>;

export const UpdateProjectRequestSchema = ProjectDraftSchema.partial()
  .extend({ name: NameSchema.optional() })
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update');
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;

const ProjectLinkSchema = z.object({ id: z.uuid(), name: z.string() });

/** Where a project sits in the projects list (newest first): its place and its neighbours. */
export const ProjectNeighborsDtoSchema = z.object({
  /** 1-based place in the list. */
  position: z.number().int().min(1),
  total: z.number().int().min(1),
  /** The newer neighbour (above it in the table). */
  previous: ProjectLinkSchema.nullable(),
  /** The older neighbour (below it in the table). */
  next: ProjectLinkSchema.nullable(),
});
export type ProjectNeighborsDto = z.infer<typeof ProjectNeighborsDtoSchema>;

export const DuplicateProjectRequestSchema = z.object({
  /** Defaults to "<name> (copy)". */
  name: NameSchema.optional(),
});
export type DuplicateProjectRequest = z.infer<typeof DuplicateProjectRequestSchema>;

/** The default name of a project's copy. */
export const copyName = (name: string): string => `${name} (copy)`.slice(0, 256);

export const RENDERED_FILTERS = ['yes', 'no'] as const;
export type RenderedFilter = (typeof RENDERED_FILTERS)[number];

/** Which projects a list, a day count or a selection covers (the table's filters). */
export const ProjectScopeSchema = z.object({
  templateId: z.string().optional(),
  rendered: z.enum(RENDERED_FILTERS).optional(),
});
export type ProjectScope = z.infer<typeof ProjectScopeSchema>;

export const ProjectListQuerySchema = PageQuerySchema.extend(ProjectScopeSchema.shape);
export type ProjectListQuery = z.infer<typeof ProjectListQuerySchema>;

export const ProjectDaysQuerySchema = ProjectScopeSchema.extend({ tz: TimeZoneSchema });
export type ProjectDaysQuery = z.infer<typeof ProjectDaysQuerySchema>;

/** One calendar day of projects, counted over every page. */
export const ProjectDayDtoSchema = z.object({
  date: DayKeySchema,
  total: z.number().int().min(0),
  notRendered: z.number().int().min(0),
});
export type ProjectDayDto = z.infer<typeof ProjectDayDtoSchema>;

/** Projects in a scope, optionally of one day: what "select the day" picks. */
export const ProjectSelectableQuerySchema = ProjectDaysQuerySchema.extend({ day: DayKeySchema.optional() });
export type ProjectSelectableQuery = z.infer<typeof ProjectSelectableQuerySchema>;

/** Most projects one bulk request takes. */
export const PROJECT_BULK_LIMIT = READY_RENDERS_LIMIT;

export const ProjectIdsRequestSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(PROJECT_BULK_LIMIT),
});
export type ProjectIdsRequest = z.infer<typeof ProjectIdsRequestSchema>;

export const ProjectFailureSchema = z.object({ projectId: z.uuid(), message: z.string() });
export type ProjectFailure = z.infer<typeof ProjectFailureSchema>;

export const RenderProjectsResponseSchema = z.object({
  /** Projects whose render was queued, with the render's id. */
  queued: z.array(z.object({ projectId: z.uuid(), renderId: z.uuid() })),
  /** Projects that could not start (invalid settings, missing media…), with the reason. */
  failed: z.array(ProjectFailureSchema),
});
export type RenderProjectsResponse = z.infer<typeof RenderProjectsResponseSchema>;

export const DeleteProjectsResponseSchema = z.object({ deleted: z.array(z.uuid()) });
export type DeleteProjectsResponse = z.infer<typeof DeleteProjectsResponseSchema>;
