import { ConsoleLogger, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SQLContext {
  constructor(
    readonly dataSource : DataSource,
    private readonly logger : ConsoleLogger,
  ) {
    this.logger.log('MySqlContext Initialized','MySqlContext')
  }

  async restartConnection(force = false){
    if (force && this.dataSource.isInitialized){
      await this.dataSource.destroy();
    }
    if (!this.dataSource.isInitialized){
      await this.dataSource.initialize();
    }
  }

  // repository<Entity = any>(entityClass: { new(): Entity }): Repository<Entity> {
  //   return this.dataSource.getRepository(entityClass);
  // }
}
