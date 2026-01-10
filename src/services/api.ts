import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';
const AUTH_TOKEN_KEY = 'native_codex_auth_token';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const setAuthToken = (token: string) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const getAuthToken = () => {
    return localStorage.getItem(AUTH_TOKEN_KEY);
};
