import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPositionToTaskStatus1710000000000 implements MigrationInterface {
  name = 'AddPositionToTaskStatus1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`task_status\` ADD \`position\` int NOT NULL DEFAULT '0'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`task_status\` DROP COLUMN \`position\``);
  }
}
