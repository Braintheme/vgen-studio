import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { MediaAssetEntity } from './media-asset.entity.js';

/** A named set of library files (e.g. a preset's settings screenshots). */
@Entity('media_group')
export class MediaGroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 256 })
  name: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

/** A file in a group. Deleting the group or the file removes the row. */
@Entity('media_group_item')
@Index('ix_media_group_item_asset', ['assetId'])
export class MediaGroupItemEntity {
  @PrimaryColumn({ type: 'uuid' })
  groupId: string;

  @PrimaryColumn({ type: 'uuid' })
  assetId: string;

  @ManyToOne(() => MediaGroupEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id', foreignKeyConstraintName: 'fk_media_group_item_group' })
  group?: Relation<MediaGroupEntity>;

  @ManyToOne(() => MediaAssetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id', foreignKeyConstraintName: 'fk_media_group_item_asset' })
  asset?: Relation<MediaAssetEntity>;
}
