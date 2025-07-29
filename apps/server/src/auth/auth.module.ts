import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UserEntity, UserTypeEntity } from '#LocalProject/Entities';
import { AuthEntity } from '#LocalProject/SqliteEntities';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt.guard';
import { JwtFallthroughGuard } from './guards/jwt-fallthrough.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserTypeEntity]),
    TypeOrmModule.forFeature([AuthEntity], 'sqlite'),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRATION') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, JwtFallthroughGuard],
  exports: [AuthService, JwtAuthGuard, JwtFallthroughGuard],
})
export class AuthModule {}
