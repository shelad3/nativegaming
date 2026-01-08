import { IBackendService } from './IBackendService';
import { backendService as mockBackend } from './mockBackend';
import { realBackend } from './realBackend';

// TOGGLE: Change this to 'REAL' to use the local Express/MongoDB backend
const BACKEND_MODE: 'MOCK' | 'REAL' = 'REAL';

export const backendService: IBackendService = BACKEND_MODE === 'REAL' ? realBackend : mockBackend;
