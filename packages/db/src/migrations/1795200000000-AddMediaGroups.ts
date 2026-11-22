import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMediaGroups1795200000000 implements MigrationInterface {
  name = 'AddMediaGroups1795200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "media_group" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(256) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_media_group" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "media_group_item" ("group_id" uuid NOT NULL, "asset_id" uuid NOT NULL, CONSTRAINT "PK_media_group_item" PRIMARY KEY ("group_id", "asset_id"))`,
    );
    await queryRunner.query(`CREATE INDEX "ix_media_group_item_asset" ON "media_group_item" ("asset_id")`);
    await queryRunner.query(
      `ALTER TABLE "media_group_item" ADD CONSTRAINT "fk_media_group_item_group" FOREIGN KEY ("group_id") REFERENCES "media_group"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_group_item" ADD CONSTRAINT "fk_media_group_item_asset" FOREIGN KEY ("asset_id") REFERENCES "media_asset"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "media_group_item"`);
    await queryRunner.query(`DROP TABLE "media_group"`);
  }
}
