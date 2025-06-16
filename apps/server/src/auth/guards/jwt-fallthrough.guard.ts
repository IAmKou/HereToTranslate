import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { ExtractJwt } from "passport-jwt";

@Injectable()
export class JwtFallthroughGuard {
  constructor(
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    try {
      request.user = await this.authService.validateToken(token);
      return true;
    } catch {
      return true;
    }
  }
}
