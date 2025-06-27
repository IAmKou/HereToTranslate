import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class BigIntSerializerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map(data => this.transformBigInt(data, new WeakSet()))
    );
  }

  private transformBigInt(data: unknown, seen: WeakSet<object>): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'bigint') {
      return data.toString();
    }

    if (Array.isArray(data)) {
      return data.map(item => this.transformBigInt(item, seen));
    }

    if (typeof data === 'object') {
      if (seen.has(data)) {
        return '[Circular]';
      }
      seen.add(data);

      const transformed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        transformed[key] = this.transformBigInt(value, seen);
      }
      return transformed;
    }

    return data;
  }
}
