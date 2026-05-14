import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '@repo/types';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Require the authenticated user to hold *all* listed permission keys.
 * Use empty list for routes that only need authentication.
 */
export const Permissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
