/**
 * Rate Limiting Middleware
 * 
 * Protects API endpoints from abuse by limiting the number of requests
 * from a single IP address within a time window.
 */

import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * Applies to all /api routes
 */
export const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15') * 60 * 1000, // 15 minutes default
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 100 requests per window default
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 'Check the Retry-After header'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip rate limiting for successful requests (optional)
    // skipSuccessfulRequests: false,
});

/**
 * Strict rate limiter for authentication endpoints
 * More restrictive to prevent brute force attacks
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Increased for dev/testing (was 5)
    message: {
        error: 'Too many login attempts, please try again after 15 minutes.',
        type: 'AUTH_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Strict rate limiter for payment endpoints
 * Prevents payment spam and fraud
 */
export const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Max 10 payment attempts per hour
    message: {
        error: 'Too many payment requests, please try again later.',
        type: 'PAYMENT_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for file uploads
 * Prevents storage abuse
 */
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Max 20 uploads per hour
    message: {
        error: 'Upload limit exceeded, please try again later.',
        type: 'UPLOAD_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
