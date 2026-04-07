export class BillingAuthorizationError extends Error {
  status: number;

  constructor(message: string = 'Forbidden', status: number = 403) {
    super(message);
    this.status = status;
  }
}

export function resolveAuthorizedBillingUserId(
  authenticatedUserId: string,
  requestedUserId?: unknown
): string {
  if (!authenticatedUserId) {
    throw new BillingAuthorizationError('Unauthorized', 401);
  }

  if (requestedUserId === undefined || requestedUserId === null || requestedUserId === '') {
    return authenticatedUserId;
  }

  if (typeof requestedUserId !== 'string' || requestedUserId !== authenticatedUserId) {
    throw new BillingAuthorizationError();
  }

  return authenticatedUserId;
}
