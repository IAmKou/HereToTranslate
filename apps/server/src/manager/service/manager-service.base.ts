import { MaybeException } from "#LocalProject/Utils/exceptions";
import { InternalServerErrorException, Logger } from "@nestjs/common";

/** Base class for all manager services (as exported `*-manager.service.ts`). */
export abstract class ManagerService {
  protected abstract readonly logger: Logger;

  unknownErrorHanlder(error: unknown, message = ''): never {
    const _message = message || 'An unknown error occurred';
    this.logger.error(`${_message}: ` + ((error as MaybeException)?.message || 'Unknown error'));
    throw new InternalServerErrorException(_message);
  }
}
