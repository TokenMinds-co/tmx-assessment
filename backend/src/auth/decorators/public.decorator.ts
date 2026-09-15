import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Opens a route to signed-out users. Every other route needs a session. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
