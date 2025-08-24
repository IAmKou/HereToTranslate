import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsSyncedFromRequestToProject1710000000002 implements MigrationInterface {
  name = 'AddIsSyncedFromRequestToProject1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isSyncedFromRequest column to project table
    await queryRunner.query(`
      ALTER TABLE \`project\`
      ADD COLUMN \`isSyncedFromRequest\` boolean NOT NULL DEFAULT false
    `);

    // Update existing projects that have requestId to set isSyncedFromRequest = true
    // This assumes there's a requestId column or some way to identify synced projects
    await queryRunner.query(`
      UPDATE \`project\`
      SET \`isSyncedFromRequest\` = true
      WHERE \`requestId\` IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`project\`
      DROP COLUMN \`isSyncedFromRequest\`
    `);
  }
}
