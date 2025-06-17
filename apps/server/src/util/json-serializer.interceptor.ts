import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";
import { JsonStringifyWithBigInt } from "./bigint-utils";

@Injectable()
export class JsonSerializerInterceptor implements NestInterceptor<unknown, string> {
  intercept(context: ExecutionContext, next: CallHandler<string>): Observable<string> | Promise<Observable<string>> {
    return next.handle()
      .pipe(map(data => {
        if (data === null || data === undefined) {
          return data;
        }

        return JsonStringifyWithBigInt(data)
      }))
  }
}
