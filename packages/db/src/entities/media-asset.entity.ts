import type { MediaKind, MediaRole } from '@vgen/shared';
import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../transformers.js';

@Entity('media_asset')
@Check(`"kind" IN ('image', 'audio', 'video')`)
@Check(`"role" IN ('upload', 'render_output', 'thumbnail', 'derivative')`)
export class MediaAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 16 })
  kind: MediaKind;

  @Index()
  @Column({ type: 'varchar', length: 32, default: 'upload' })
  role: MediaRole;

  @Column({ type: 'varchar', length: 512 })
  originalName: string;

  @Column({ type: 'varchar', length: 128 })
  mime: string;

  @Column({ type: 'bigint', transformer: numericTransformer })
  size: number;

  /** Storage-relative key; never an absolute path, so storage backends are swappable. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 1024 })
  storageKey: string;

  @Column({ type: 'integer', nullable: true })
  width: number | null;

  @Column({ type: 'integer', nullable: true })
  height: number | null;

  @Column({ type: 'double precision', nullable: true })
  durationSec: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string | null;

  /** Kind-specific extras: color profile, derivative keys, waveform peaks key, etc. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  meta: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
