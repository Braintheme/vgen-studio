import type { QualityPreset } from '@vgen/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { StylePresetEntity } from './style-preset.entity.js';

/** One future video: a template with its settings and media, rendered when the owner says so. */
@Entity('project')
@Index('ix_project_created', ['createdAt'])
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Index('ix_project_template')
  @Column({ type: 'varchar', length: 128 })
  templateId: string;

  /** Template version the settings were last saved with. */
  @Column({ type: 'varchar', length: 32 })
  templateVersion: string;

  /** Raw form values, as the editor's draft holds them (validated when a render starts). */
  @Column({ type: 'jsonb' })
  settings: Record<string, unknown>;

  /** Slot key -> asset id(s) or null. */
  @Column({ type: 'jsonb' })
  media: Record<string, string | string[] | null>;

  @Column({ type: 'varchar', length: 16, default: 'social' })
  quality: QualityPreset;

  @Column({ type: 'smallint', default: 1 })
  scale: number;

  @Column({ type: 'uuid', nullable: true })
  presetId: string | null;

  @ManyToOne(() => StylePresetEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'preset_id', foreignKeyConstraintName: 'fk_project_preset' })
  preset?: Relation<StylePresetEntity> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /** Last change of the content (not of the name): "edited since the last render". */
  @Column({ type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
