import type { RenderStatus } from '@vgen/shared';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { MediaAssetEntity } from './media-asset.entity.js';
import { StylePresetEntity } from './style-preset.entity.js';

@Entity('render_job')
@Check(`"status" IN ('queued', 'rendering', 'done', 'failed', 'cancelled')`)
@Check(`"progress" BETWEEN 0 AND 100`)
@Index('ix_render_job_status_created', ['status', 'createdAt'])
export class RenderJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 16, default: 'queued' })
  status: RenderStatus;

  @Column({ type: 'smallint', default: 0 })
  progress: number;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  engine: string;

  /** Filled in by the worker that actually rendered the job. */
  @Column({ type: 'varchar', length: 32, nullable: true })
  engineVersion: string | null;

  @Index()
  @Column({ type: 'varchar', length: 128 })
  templateId: string;

  @Column({ type: 'varchar', length: 32 })
  templateVersion: string;

  /** Full validated props snapshot, enough to re-render the job one-to-one. */
  @Column({ type: 'jsonb' })
  props: Record<string, unknown>;

  @Column({ type: 'varchar', length: 8 })
  format: string;

  @Column({ type: 'varchar', length: 16, default: 'social' })
  quality: string;

  @Column({ type: 'uuid', nullable: true })
  presetId: string | null;

  @ManyToOne(() => StylePresetEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'preset_id' })
  preset?: Relation<StylePresetEntity> | null;

  /** Download file name, computed at creation time. */
  @Column({ type: 'varchar', length: 256 })
  outputName: string;

  @Column({ type: 'uuid', nullable: true })
  outputAssetId: string | null;

  @ManyToOne(() => MediaAssetEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'output_asset_id' })
  outputAsset?: Relation<MediaAssetEntity> | null;

  @Column({ type: 'uuid', nullable: true })
  thumbnailAssetId: string | null;

  @ManyToOne(() => MediaAssetEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'thumbnail_asset_id' })
  thumbnailAsset?: Relation<MediaAssetEntity> | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'smallint', default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
