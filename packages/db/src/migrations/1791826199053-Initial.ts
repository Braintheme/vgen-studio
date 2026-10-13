import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1791826199053 implements MigrationInterface {
  name = 'Initial1791826199053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "media_asset" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "kind" character varying(16) NOT NULL, "role" character varying(32) NOT NULL DEFAULT 'upload', "original_name" character varying(512) NOT NULL, "mime" character varying(128) NOT NULL, "size" bigint NOT NULL, "storage_key" character varying(1024) NOT NULL, "width" integer, "height" integer, "duration_sec" double precision, "checksum" character varying(64), "meta" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_c0214d14e4db9664ff558b3f78" CHECK ("role" IN ('upload', 'render_output', 'thumbnail', 'derivative')), CONSTRAINT "CHK_aff44e965f3f0f76157b7411f7" CHECK ("kind" IN ('image', 'audio', 'video')), CONSTRAINT "PK_facd363e2bf84400ac44913a2f3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_5057168ec6faeb9897d7e1a517" ON "media_asset"  ("role") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1fb994f29b8515b7c471e71b23" ON "media_asset"  ("storage_key") `,
    );
    await queryRunner.query(
      `CREATE TABLE "music_track" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "title" character varying(256) NOT NULL, "asset_id" uuid NOT NULL, "duration_sec" double precision NOT NULL, "is_default" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9a090fb324070ae864a39e894e6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_music_track_default" ON "music_track"  ("is_default") WHERE "is_default" = true`,
    );
    await queryRunner.query(
      `CREATE TABLE "style_preset" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(256) NOT NULL, "template_id" character varying(128) NOT NULL, "template_version" character varying(32) NOT NULL, "props" jsonb NOT NULL, "is_default" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_16395360d5d5e38e971b4045841" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_abf70d9805219e4dc27d18d009" ON "style_preset"  ("template_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_style_preset_default" ON "style_preset"  ("template_id") WHERE "is_default" = true`,
    );
    await queryRunner.query(
      `CREATE TABLE "render_job" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "status" character varying(16) NOT NULL DEFAULT 'queued', "progress" smallint NOT NULL DEFAULT '0', "engine" character varying(64) NOT NULL, "engine_version" character varying(32), "template_id" character varying(128) NOT NULL, "template_version" character varying(32) NOT NULL, "props" jsonb NOT NULL, "format" character varying(8) NOT NULL, "quality" character varying(16) NOT NULL DEFAULT 'social', "preset_id" uuid, "output_name" character varying(256) NOT NULL, "output_asset_id" uuid, "thumbnail_asset_id" uuid, "error" text, "attempts" smallint NOT NULL DEFAULT '0', "started_at" TIMESTAMP WITH TIME ZONE, "finished_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_e8768c282c6458e3ed1b082430" CHECK ("progress" BETWEEN 0 AND 100), CONSTRAINT "CHK_b0d6c49c2b92f08a2ade80198e" CHECK ("status" IN ('queued', 'rendering', 'done', 'failed', 'cancelled')), CONSTRAINT "PK_a00488019eafb11b27af1aa1a76" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_01848b30605777990aa771f9f5" ON "render_job"  ("engine") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_3d2ae261e8855b58d8c77b1713" ON "render_job"  ("template_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_render_job_status_created" ON "render_job"  ("status", "created_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "music_track" ADD CONSTRAINT "FK_f6393f0f417aee01bb270ac9718" FOREIGN KEY ("asset_id") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "render_job" ADD CONSTRAINT "FK_b982c7408c405945eeb826eb481" FOREIGN KEY ("preset_id") REFERENCES "style_preset"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "render_job" ADD CONSTRAINT "FK_ef19aa388fce7d09cbb169287b6" FOREIGN KEY ("output_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "render_job" ADD CONSTRAINT "FK_7cd80c049347c8e0569dacb5173" FOREIGN KEY ("thumbnail_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "render_job" DROP CONSTRAINT "FK_7cd80c049347c8e0569dacb5173"`);
    await queryRunner.query(`ALTER TABLE "render_job" DROP CONSTRAINT "FK_ef19aa388fce7d09cbb169287b6"`);
    await queryRunner.query(`ALTER TABLE "render_job" DROP CONSTRAINT "FK_b982c7408c405945eeb826eb481"`);
    await queryRunner.query(`ALTER TABLE "music_track" DROP CONSTRAINT "FK_f6393f0f417aee01bb270ac9718"`);
    await queryRunner.query(`DROP INDEX "public"."ix_render_job_status_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3d2ae261e8855b58d8c77b1713"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_01848b30605777990aa771f9f5"`);
    await queryRunner.query(`DROP TABLE "render_job"`);
    await queryRunner.query(`DROP INDEX "public"."uq_style_preset_default"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_abf70d9805219e4dc27d18d009"`);
    await queryRunner.query(`DROP TABLE "style_preset"`);
    await queryRunner.query(`DROP INDEX "public"."uq_music_track_default"`);
    await queryRunner.query(`DROP TABLE "music_track"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1fb994f29b8515b7c471e71b23"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5057168ec6faeb9897d7e1a517"`);
    await queryRunner.query(`DROP TABLE "media_asset"`);
  }
}
