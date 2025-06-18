import { IRegisterDto } from '@here-to-translate/common/interfaces';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsPhoneNumber, IsStrongPassword } from 'class-validator';

export class RegisterDto implements IRegisterDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  username: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @IsStrongPassword({
    minLength: 8,
    minSymbols: 1,
    minNumbers: 1,
    minLowercase: 1,
    minUppercase: 1
  }, { message: 'Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character' })
  password: string;

  @IsNotEmpty()
  @IsPhoneNumber(undefined, {
    message: 'Phone number must be a valid international format, e.g. +1234567890'
  })
  phone: string;

  @IsNotEmpty()
  @IsString()
  fullName: string;
}

export class UpdateProfileDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  phone: string;
}

