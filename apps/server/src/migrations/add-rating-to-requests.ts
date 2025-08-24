import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRatingToRequests1713950000000 implements MigrationInterface {
  name = 'AddRatingToRequests1713950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE requests
      ADD COLUMN rating INT NULL COMMENT 'Rating from 1-5 stars given by requester to translator'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE requests
      DROP COLUMN rating
    `);
  }
}
