import { MaybeException } from "#LocalProject/Exceptions";
import { InternalServerErrorException, Logger } from "@nestjs/common";

/** Base class for all HTTP-interfacing services (that throws `HttpExceptions`). */
export abstract class CommonHttpServiceImpl {
  protected abstract readonly logger: Logger;

  unknownErrorHanlder(error: unknown, message = ''): never {
    const _message = message || 'An unknown error occurred';
    this.logger.error(`${_message}: ` + ((error as MaybeException)?.message ?? 'Unknown error'));
    throw new InternalServerErrorException(_message);
  }
}
