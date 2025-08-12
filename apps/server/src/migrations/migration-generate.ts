import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { MySqlConnection } from '../db/mysql/mysql.connection';

async function generateMigration() {
  const config = new ConfigService();
  const mysqlConnection = new MySqlConnection(config);

  try {
    await mysqlConnection.init();
    const dataSource = mysqlConnection.dataSource;

    // Generate migration
    const migration = await dataSource.driver.createSchemaBuilder().log();

    const upQueries = migration.upQueries || [];
    const downQueries = migration.downQueries || [];

    if (upQueries.length === 0) {
      console.log('No changes detected. No migration needed.');
      return;
    }

    console.log('Migration changes detected:');
    upQueries.forEach((query: any, index: number) => {
      console.log(`${index + 1}. ${query.query}`);
    });

    // Generate migration file
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const migrationName = `Migration${timestamp}`;

    console.log(`\nTo generate migration file, run:`);
    console.log(`npx typeorm migration:generate -d apps/server/src/db/mysql/mysql.connection.ts ${migrationName}`);

  } catch (error) {
    console.error('Error generating migration:', error);
  } finally {
    await mysqlConnection.close();
  }
}

generateMigration();
