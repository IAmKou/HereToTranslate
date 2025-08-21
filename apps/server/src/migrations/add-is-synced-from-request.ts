import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsSyncedFromRequestToFile1710000000001 implements MigrationInterface {
  name = 'AddIsSyncedFromRequestToFile1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`file\`
      ADD COLUMN \`isSyncedFromRequest\` boolean NOT NULL DEFAULT false
    `);

    // Backfill: any file having a non-null requestId should be marked as synced
    await queryRunner.query(`
      UPDATE \`file\` SET \`isSyncedFromRequest\` = true WHERE \`requestId\` IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`file\` DROP COLUMN \`isSyncedFromRequest\`
    `);
  }
}


