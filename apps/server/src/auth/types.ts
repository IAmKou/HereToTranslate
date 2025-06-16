import type { IUserAuth } from '@here-to-translate/common/interfaces';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: IUserAuth;
}
