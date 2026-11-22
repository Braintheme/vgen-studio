import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjects1795100000000 implements MigrationInterface {
  name = 'AddProjects1795100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "project" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(256) NOT NULL, "template_id" character varying(128) NOT NULL, "template_version" character varying(32) NOT NULL, "settings" jsonb NOT NULL, "media" jsonb NOT NULL, "quality" character varying(16) NOT NULL DEFAULT 'social', "scale" smallint NOT NULL DEFAULT '1', "preset_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_project" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "ix_project_created" ON "project" ("created_at")`);
    await queryRunner.query(`CREATE INDEX "ix_project_template" ON "project" ("template_id")`);
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "fk_project_preset" FOREIGN KEY ("preset_id") REFERENCES "style_preset"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "render_job" ADD "project_id" uuid`);
    await queryRunner.query(`CREATE INDEX "ix_render_job_project" ON "render_job" ("project_id")`);
    await queryRunner.query(
      `ALTER TABLE "render_job" ADD CONSTRAINT "fk_render_job_project" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "render_job" DROP CONSTRAINT "fk_render_job_project"`);
    await queryRunner.query(`DROP INDEX "ix_render_job_project"`);
    await queryRunner.query(`ALTER TABLE "render_job" DROP COLUMN "project_id"`);
    await queryRunner.query(`DROP TABLE "project"`);
  }
}
