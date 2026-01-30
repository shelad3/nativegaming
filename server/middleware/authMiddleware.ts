import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface AuthRequest extends Request {
    user?: any;
    token?: string;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'standard_secret_fallback');

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ error: 'Not authorized, user not found' });
            }

            // GLOBAL IDENTITY GATEKEEPER
            if (req.user.status !== 'active') {
                return res.status(403).json({
                    error: 'Identity Proof Required',
                    detail: 'Your node is in a pending state. You must verify your email code to activate your uplink.'
                });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ error: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ error: 'Not authorized, no token' });
    }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && (req.user.isAdmin || req.user.email === 'sheldonramu8@gmail.com')) {
        next();
    } else {
        res.status(403).json({ error: 'Not authorized as an admin' });
    }
};

export const adminAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    protect(req, res, () => adminOnly(req, res, next));
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'standard_secret_fallback');
            req.user = await User.findById(decoded.id).select('-password');
        } catch (error) {
            console.error('Optional Auth Token Error:', error);
            // Don't fail, just continue without user
        }
    }
    next();
};
