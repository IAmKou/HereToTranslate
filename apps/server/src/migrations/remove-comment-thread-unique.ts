import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCommentThreadUnique1710000000001 implements MigrationInterface {
  name = 'RemoveCommentThreadUnique1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, get the actual foreign key constraint names
    const foreignKeys = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'comments' 
       AND REFERENCED_TABLE_NAME = 'threads'`
    );

    // Drop all foreign key constraints first
    if (foreignKeys.length > 0) {
      for (const fk of foreignKeys) {
        try {
          await queryRunner.query(
            `ALTER TABLE \`comments\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
          );
        } catch (error: any) {
          console.log(`Warning: Could not drop foreign key ${fk.CONSTRAINT_NAME}:`, error.message);
        }
      }
    }

    // Now safely drop the unique index
    try {
      await queryRunner.query(
        `ALTER TABLE \`comments\` DROP INDEX \`IDX_f682eb665c360168731f596b0e\``
      );
    } catch (error: any) {
      console.log(`Warning: Could not drop index IDX_f682eb665c360168731f596b0e:`, error.message);
    }

    // Recreate the foreign key constraint without the unique constraint
    try {
      await queryRunner.query(
        `ALTER TABLE \`comments\` ADD CONSTRAINT \`FK_comments_thread\` 
         FOREIGN KEY (\`threadId\`) REFERENCES \`threads\`(\`id\`) ON DELETE CASCADE`
      );
    } catch (error: any) {
      console.log(`Warning: Could not recreate foreign key:`, error.message);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the foreign key constraint
    try {
      await queryRunner.query(
        `ALTER TABLE \`comments\` DROP FOREIGN KEY \`FK_comments_thread\``
      );
    } catch (error: any) {
      console.log(`Warning: Could not drop foreign key FK_comments_thread:`, error.message);
    }

    // Re-add the unique index
    try {
      await queryRunner.query(
        `ALTER TABLE \`comments\` ADD UNIQUE INDEX \`IDX_f682eb665c360168731f596b0e\` (\`threadId\`)`
      );
    } catch (error: any) {
      console.log(`Warning: Could not recreate unique index:`, error.message);
    }

    // Recreate the foreign key constraint
    try {
      await queryRunner.query(
        `ALTER TABLE \`comments\` ADD CONSTRAINT \`FK_comments_thread\` 
         FOREIGN KEY (\`threadId\`) REFERENCES \`threads\`(\`id\`) ON DELETE CASCADE`
      );
    } catch (error: any) {
      console.log(`Warning: Could not recreate foreign key:`, error.message);
    }
  }
}
