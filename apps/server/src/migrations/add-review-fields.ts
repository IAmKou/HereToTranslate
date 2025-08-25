import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewFields1710000000000 implements MigrationInterface {
  name = 'AddReviewFields1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add review fields to requests table
    await queryRunner.query(`
      ALTER TABLE requests
      ADD COLUMN reviewedAt DATETIME NULL COMMENT 'When the request was reviewed',
      ADD COLUMN reviewDecision ENUM('APPROVED', 'REJECTED') NULL COMMENT 'Review decision',
      ADD COLUMN reviewRating INT NULL COMMENT 'Review rating from 1-5 stars',
      ADD COLUMN reviewComment TEXT NULL COMMENT 'Review comment from requester'
    `);

    // Add rating fields to user table
    await queryRunner.query(`
      ALTER TABLE user
      ADD COLUMN rating DECIMAL(3,1) NULL COMMENT 'Average rating from 1-5 stars',
      ADD COLUMN reviewCount INT NULL COMMENT 'Total number of reviews received',
      ADD COLUMN lastReviewComment TEXT NULL COMMENT 'Last review comment received'
    `);

    // Add indexes for better performance
    await queryRunner.query(`
      CREATE INDEX idx_requests_reviewed_at ON requests(reviewedAt);
      CREATE INDEX idx_requests_review_decision ON requests(reviewDecision);
      CREATE INDEX idx_user_rating ON user(rating);
      CREATE INDEX idx_user_review_count ON user(reviewCount);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes
    await queryRunner.query(`
      DROP INDEX idx_requests_reviewed_at ON requests;
      DROP INDEX idx_requests_review_decision ON requests;
      DROP INDEX idx_user_rating ON user;
      DROP INDEX idx_user_review_count ON user;
    `);

    // Remove rating fields from user table
    await queryRunner.query(`
      ALTER TABLE user
      DROP COLUMN rating,
      DROP COLUMN reviewCount,
      DROP COLUMN lastReviewComment
    `);

    // Remove review fields from requests table
    await queryRunner.query(`
      ALTER TABLE requests
      DROP COLUMN reviewedAt,
      DROP COLUMN reviewDecision,
      DROP COLUMN reviewRating,
      DROP COLUMN reviewComment
    `);
  }
}
