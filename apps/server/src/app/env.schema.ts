import { IsIP, IsNotEmpty, IsNumber, IsString, Max, Min } from "class-validator";

export class EnvConfigs {
  @IsIP()
  readonly MYSQL_HOST: string;
  @IsNumber()
  @Min(1)
  @Max(65535)
  readonly MYSQL_PORT: number;

  @IsString()
  @IsNotEmpty()
  readonly MYSQL_USER: string;

  @IsString()
  @IsNotEmpty()
  readonly MYSQL_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  readonly MYSQL_DATABASE: string;

  @IsString()
  @IsNotEmpty()
  readonly MONGODB_URI: string;

  @IsString()
  @IsNotEmpty()
  readonly MONGODB_DB: string;

  @IsString()
  @IsNotEmpty()
  readonly JWT_SECRET: string;
  @IsString()
  readonly JWT_EXPIRATION = "5m";

  @IsString()
  @IsNotEmpty()
  readonly GOOGLE_OAUTH2_CLIENT: string;
}
