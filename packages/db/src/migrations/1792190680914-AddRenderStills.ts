import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRenderStills1792190680914 implements MigrationInterface {
  name = 'AddRenderStills1792190680914';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "render_job" ADD "scale" smallint NOT NULL DEFAULT '1'`);
    await queryRunner.query(
      `ALTER TABLE "render_job" ADD "slide_asset_ids" uuid array NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "render_job" DROP COLUMN "slide_asset_ids"`);
    await queryRunner.query(`ALTER TABLE "render_job" DROP COLUMN "scale"`);
  }
}
