import { Injectable } from '@nestjs/common';
import type { MediaAssetEntity, MusicTrackEntity } from '@vgen/db';
import type { CreateMusicTrackRequest, MusicTrackDto } from '@vgen/shared';
import { ConflictError, NotFoundError, ValidationFailedError } from '../common/errors.js';
import { toMediaDto } from '../media/media.mapper.js';
import { MediaService } from '../media/media.service.js';
import { PresetsService } from '../presets/presets.service.js';
import { MusicRepository } from './music.repository.js';

const toTrackDto = (
  track: MusicTrackEntity,
  asset: MediaAssetEntity | undefined,
  presetCount: number,
): MusicTrackDto => {
  const media = asset ? toMediaDto(asset) : null;
  return {
    id: track.id,
    title: track.title,
    assetId: track.assetId,
    durationSec: track.durationSec,
    isDefault: track.isDefault,
    url: media?.url ?? '',
    peaksUrl: media?.peaksUrl ?? null,
    presetCount,
    createdAt: track.createdAt.toISOString(),
  };
};

/** The music library: uploaded audio files registered as tracks, one of them the default. */
@Injectable()
export class MusicService {
  constructor(
    private readonly repository: MusicRepository,
    private readonly media: MediaService,
    private readonly presets: PresetsService,
  ) {}

  async list(): Promise<MusicTrackDto[]> {
    const tracks = await this.repository.list();
    const assets = new Map(
      (await this.media.findMany(tracks.map((track) => track.assetId))).map((asset) => [asset.id, asset]),
    );
    const usage = await this.presets.countByTrack();
    return tracks.map((track) => toTrackDto(track, assets.get(track.assetId), usage.get(track.id) ?? 0));
  }

  async get(id: string): Promise<MusicTrackDto> {
    const track = await this.require(id);
    const [asset] = await this.media.findMany([track.assetId]);
    const usage = await this.presets.countByTrack();
    return toTrackDto(track, asset, usage.get(track.id) ?? 0);
  }

  /**
   * The track a render will play: the chosen one, or the library default for `null`.
   * A chosen track that no longer exists is a 400 (like deleted media).
   */
  async resolveForRender(trackId: string | null): Promise<MusicTrackEntity | null> {
    if (trackId === null) return this.repository.findDefault();
    const track = await this.repository.findById(trackId);
    if (!track) {
      throw new ValidationFailedError(`Music track "${trackId}" not found`, [
        { path: 'props.music.trackId', message: 'The track was deleted; pick another one' },
      ]);
    }
    return track;
  }

  /** The first track of the library becomes the default automatically. */
  async create(request: CreateMusicTrackRequest): Promise<MusicTrackDto> {
    const asset = await this.media.requireUploadedAudio(request.assetId);
    if (await this.repository.findByAsset(asset.id)) {
      throw new ConflictError('This audio file is already a track in the library');
    }
    const track = await this.repository.save({
      title: request.title,
      assetId: asset.id,
      durationSec: asset.durationSec ?? 0,
      isDefault: !(await this.repository.hasDefault()),
    });
    return toTrackDto(track, asset, 0);
  }

  async rename(id: string, title: string): Promise<MusicTrackDto> {
    await this.require(id);
    await this.repository.rename(id, title);
    return this.get(id);
  }

  async setDefault(id: string): Promise<MusicTrackDto> {
    await this.require(id);
    await this.repository.setDefault(id);
    return this.get(id);
  }

  /** Deletes the track and its audio file. Renders that used it keep their output video. */
  async remove(id: string): Promise<void> {
    const track = await this.require(id);
    await this.repository.delete(id);
    await this.media.deleteUpload(track.assetId);
  }

  private async require(id: string): Promise<MusicTrackEntity> {
    const track = await this.repository.findById(id);
    if (!track) throw new NotFoundError('Music track', id);
    return track;
  }
}
