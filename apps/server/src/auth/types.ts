import type { IUserAuthMeta } from '@here-to-translate/common/interfaces';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: IUserAuthMeta;
}
