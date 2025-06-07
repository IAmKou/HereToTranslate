import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UserEntity } from '../db/mysql/entity/user.entity';
import { AuthController } from './auth.controller';
import { UserController } from '../users/user.controller'; // Add this import
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRATION') || '5m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, UserController], // Add UserController here
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
