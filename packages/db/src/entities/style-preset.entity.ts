import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('style_preset')
// At most one default preset per template.
@Index('uq_style_preset_default', ['templateId'], { unique: true, where: '"is_default" = true' })
export class StylePresetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 128 })
  templateId: string;

  /** Template version the props were authored against; enables props migrations. */
  @Column({ type: 'varchar', length: 32 })
  templateVersion: string;

  /** Style-scoped props only (content fields are stripped). */
  @Column({ type: 'jsonb' })
  props: Record<string, unknown>;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
