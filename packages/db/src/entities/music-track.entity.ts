import {
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

@Entity('music_track')
// At most one default track across the library.
@Index('uq_music_track_default', ['isDefault'], { unique: true, where: '"is_default" = true' })
export class MusicTrackEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 256 })
  title: string;

  @Column({ type: 'uuid' })
  assetId: string;

  @ManyToOne(() => MediaAssetEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'asset_id' })
  asset?: Relation<MediaAssetEntity>;

  @Column({ type: 'double precision' })
  durationSec: number;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
