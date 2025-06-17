import { IsNumberString } from "class-validator";

export class RegularIdParamDto {
  @IsNumberString()
  id: string;
}
