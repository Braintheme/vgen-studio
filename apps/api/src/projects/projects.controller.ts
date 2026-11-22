import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateProjectRequestSchema,
  DeleteProjectsResponseSchema,
  DuplicateProjectRequestSchema,
  paginated,
  ProjectDayDtoSchema,
  ProjectDaysQuerySchema,
  ProjectDtoSchema,
  ProjectIdsRequestSchema,
  ProjectListQuerySchema,
  ProjectNeighborsDtoSchema,
  ProjectSelectableQuerySchema,
  RenderProjectsResponseSchema,
  UpdateProjectRequestSchema,
  type DeleteProjectsResponse,
  type Paginated,
  type ProjectDayDto,
  type ProjectDto,
  type ProjectNeighborsDto,
  type RenderProjectsResponse,
} from '@vgen/shared';
import { z } from 'zod';
import { ProjectsService } from './projects.service.js';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  /** A project from a template (+ its default preset) or a preset, with optional settings and media. */
  @Post()
  @ApiCreatedResponse({ standardSchema: ProjectDtoSchema })
  create(
    @Body({ schema: CreateProjectRequestSchema }) body: z.output<typeof CreateProjectRequestSchema>,
  ): Promise<ProjectDto> {
    return this.projects.create(body);
  }

  @Get()
  @ApiOkResponse({ standardSchema: paginated(ProjectDtoSchema) })
  list(
    @Query({ schema: ProjectListQuerySchema }) query: z.output<typeof ProjectListQuerySchema>,
  ): Promise<Paginated<ProjectDto>> {
    return this.projects.list(query);
  }

  /** Projects per calendar day of a time zone, over every page. Declared before `:id`. */
  @Get('days')
  @ApiOkResponse({ standardSchema: z.array(ProjectDayDtoSchema) })
  days(
    @Query({ schema: ProjectDaysQuerySchema }) query: z.output<typeof ProjectDaysQuerySchema>,
  ): Promise<ProjectDayDto[]> {
    return this.projects.days(query);
  }

  /** Projects in a scope, optionally of one day (bulk selection). */
  @Get('selectable')
  @ApiOkResponse({ standardSchema: z.array(ProjectDtoSchema) })
  selectable(
    @Query({ schema: ProjectSelectableQuerySchema }) query: z.output<typeof ProjectSelectableQuerySchema>,
  ): Promise<ProjectDto[]> {
    return this.projects.selectable(query);
  }

  /** Queues a render per project; the ones that cannot start are listed with the reason. */
  @Post('render')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: RenderProjectsResponseSchema })
  render(
    @Body({ schema: ProjectIdsRequestSchema }) body: z.output<typeof ProjectIdsRequestSchema>,
  ): Promise<RenderProjectsResponse> {
    return this.projects.render(body.ids);
  }

  /** Deletes several projects (their renders stay). */
  @Post('delete')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: DeleteProjectsResponseSchema })
  removeMany(
    @Body({ schema: ProjectIdsRequestSchema }) body: z.output<typeof ProjectIdsRequestSchema>,
  ): Promise<DeleteProjectsResponse> {
    return this.projects.removeMany(body.ids);
  }

  @Get(':id')
  @ApiOkResponse({ standardSchema: ProjectDtoSchema })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectDto> {
    return this.projects.get(id);
  }

  /** The project's place in the list and its neighbours (the editor's Prev / Next). */
  @Get(':id/neighbors')
  @ApiOkResponse({ standardSchema: ProjectNeighborsDtoSchema })
  neighbors(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectNeighborsDto> {
    return this.projects.neighbors(id);
  }

  /** Saves the editor's changes (name, settings, media, quality, scale, preset). */
  @Patch(':id')
  @ApiOkResponse({ standardSchema: ProjectDtoSchema })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: UpdateProjectRequestSchema }) body: z.output<typeof UpdateProjectRequestSchema>,
  ): Promise<ProjectDto> {
    return this.projects.update(id, body);
  }

  /** A copy of the project (content only; not rendered yet). */
  @Post(':id/duplicate')
  @ApiCreatedResponse({ standardSchema: ProjectDtoSchema })
  duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: DuplicateProjectRequestSchema }) body: z.output<typeof DuplicateProjectRequestSchema>,
  ): Promise<ProjectDto> {
    return this.projects.duplicate(id, body.name);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.projects.remove(id);
  }
}
