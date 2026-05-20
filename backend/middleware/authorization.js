/**
 * Authorization Middleware
 *
 * DEV MODE: All authorization checks disabled. Every authenticated user can
 * access every resource. Re-enable for production by restoring the gates
 * from git history.
 */

export const canAccessUnit = (req, res, next) => next();

export const canAccessBooking = (req, res, next) => next();

export const checkRole = (..._allowedRoles) => (req, res, next) => next();
