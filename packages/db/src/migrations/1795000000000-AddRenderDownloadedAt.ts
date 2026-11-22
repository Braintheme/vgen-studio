import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRenderDownloadedAt1795000000000 implements MigrationInterface {
  name = 'AddRenderDownloadedAt1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "render_job" ADD "downloaded_at" TIMESTAMP WITH TIME ZONE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "render_job" DROP COLUMN "downloaded_at"`);
  }
}
