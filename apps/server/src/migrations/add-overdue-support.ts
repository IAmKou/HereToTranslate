import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOverdueSupport1710000000000 implements MigrationInterface {
  name = 'AddOverdueSupport1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isOverdue column to task table
    await queryRunner.query(`
      ALTER TABLE \`task\` 
      ADD COLUMN \`isOverdue\` boolean NOT NULL DEFAULT false
    `);

    // Add isOverdue column to subtask table
    await queryRunner.query(`
      ALTER TABLE \`subtask\` 
      ADD COLUMN \`isOverdue\` boolean NOT NULL DEFAULT false
    `);

    // Add startedAt and completedAt columns to subtask table
    await queryRunner.query(`
      ALTER TABLE \`subtask\` 
      ADD COLUMN \`startedAt\` datetime NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`subtask\` 
      ADD COLUMN \`completedAt\` datetime NULL
    `);

    // Add priority column to subtask table
    await queryRunner.query(`
      ALTER TABLE \`subtask\` 
      ADD COLUMN \`priority\` enum('low', 'medium', 'high') NOT NULL DEFAULT 'medium'
    `);

    // Rename estimatedDue to dueDate in subtask table
    await queryRunner.query(`
      ALTER TABLE \`subtask\` 
      CHANGE COLUMN \`estimatedDue\` \`dueDate\` datetime NULL
    `);

    // Add assignedTo, reviewer, approver columns to subtask table
    await queryRunner.query(`
      ALTER TABLE \`subtask\` 
      ADD COLUMN \`assignedToId\` bigint unsigned NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`subtask\` 
      ADD COLUMN \`reviewerId\` bigint unsigned NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`subtask\` 
      ADD COLUMN \`approverId\` bigint unsigned NULL
    `);

    // Add foreign key constraints for subtask assignments
    await queryRunner.query(`
      ALTER TABLE \`subtask\` 
      ADD CONSTRAINT \`FK_subtask_assigned_to\` 
      FOREIGN KEY (\`assignedToId\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`subtask\` 
      ADD CONSTRAINT \`FK_subtask_reviewer\` 
      FOREIGN KEY (\`reviewerId\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`subtask\` 
      ADD CONSTRAINT \`FK_subtask_approver\` 
      FOREIGN KEY (\`approverId\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL
    `);

    // Add indexes for better performance
    await queryRunner.query(`
      CREATE INDEX \`IDX_task_is_overdue\` ON \`task\` (\`isOverdue\`)
    `);

    await queryRunner.query(`
      CREATE INDEX \`IDX_subtask_is_overdue\` ON \`subtask\` (\`isOverdue\`)
    `);

    await queryRunner.query(`
      CREATE INDEX \`IDX_task_due_date\` ON \`task\` (\`dueDate\`)
    `);

    await queryRunner.query(`
      CREATE INDEX \`IDX_subtask_due_date\` ON \`subtask\` (\`dueDate\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes
    await queryRunner.query(`DROP INDEX \`IDX_subtask_due_date\` ON \`subtask\``);
    await queryRunner.query(`DROP INDEX \`IDX_task_due_date\` ON \`task\``);
    await queryRunner.query(`DROP INDEX \`IDX_subtask_is_overdue\` ON \`subtask\``);
    await queryRunner.query(`DROP INDEX \`IDX_task_is_overdue\` ON \`task\``);

    // Remove foreign key constraints
    await queryRunner.query(`ALTER TABLE \`subtask\` DROP FOREIGN KEY \`FK_subtask_approver\``);
    await queryRunner.query(`ALTER TABLE \`subtask\` DROP FOREIGN KEY \`FK_subtask_reviewer\``);
    await queryRunner.query(`ALTER TABLE \`subtask\` DROP FOREIGN KEY \`FK_subtask_assigned_to\``);

    // Remove columns from subtask table
    await queryRunner.query(`ALTER TABLE \`subtask\` DROP COLUMN \`approverId\``);
    await queryRunner.query(`ALTER TABLE \`subtask\` DROP COLUMN \`reviewerId\``);
    await queryRunner.query(`ALTER TABLE \`subtask\` DROP COLUMN \`assignedToId\``);
    await queryRunner.query(`ALTER TABLE \`subtask\` DROP COLUMN \`priority\``);
    await queryRunner.query(`ALTER TABLE \`subtask\` DROP COLUMN \`completedAt\``);
    await queryRunner.query(`ALTER TABLE \`subtask\` DROP COLUMN \`startedAt\``);
    await queryRunner.query(`ALTER TABLE \`subtask\` DROP COLUMN \`isOverdue\``);

    // Rename dueDate back to estimatedDue
    await queryRunner.query(`
      ALTER TABLE \`subtask\` 
      CHANGE COLUMN \`dueDate\` \`estimatedDue\` datetime NULL
    `);

    // Remove isOverdue column from task table
    await queryRunner.query(`ALTER TABLE \`task\` DROP COLUMN \`isOverdue\``);
  }
}
