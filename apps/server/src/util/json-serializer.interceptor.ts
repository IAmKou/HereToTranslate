import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";
import { JsonStringifyWithBigInt } from "./bigint-utils";

@Injectable()
export class JsonSerializerInterceptor<T = unknown> implements NestInterceptor<T, string> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<string> {
    return next.handle()
      .pipe(map(data => {
        if (data === null || data === undefined) {
          return JSON.stringify(data);
        }
        return JsonStringifyWithBigInt(data)
      }))
  }
}
