import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'HTT_PUBLIC_ENDPOINT';
export const IsPublicEndpoint = () => SetMetadata(IS_PUBLIC_KEY, true);
