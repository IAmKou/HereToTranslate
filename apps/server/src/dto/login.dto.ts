import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ILoginDto } from '@here-to-translate/common/interfaces';

export class LoginDto implements ILoginDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
