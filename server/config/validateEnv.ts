/**
 * Environment Variable Validation
 * 
 * Validates that all required environment variables are present
 * before the server starts, preventing runtime errors.
 */

interface EnvironmentConfig {
    // Database
    MONGODB_URI: string;

    // Authentication
    JWT_SECRET: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;

    // Pesapal Payment (optional in development)
    PESAPAL_CONSUMER_KEY: string;
    PESAPAL_CONSUMER_SECRET: string;
    PESAPAL_ENVIRONMENT: 'sandbox' | 'production';
    PESAPAL_IPN_URL: string;

    // Server
    PORT?: string;
    NODE_ENV?: string;
    FRONTEND_URL?: string;
}

/**
 * Validates that all required environment variables are set
 * @throws Error if any required variables are missing
 */
export function validateEnvironment(): EnvironmentConfig {
    // Always required
    const required: string[] = [
        'MONGODB_URI',
        'JWT_SECRET'
    ];

    // Pesapal is required in production, optional in development
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
        required.push('PESAPAL_CONSUMER_KEY', 'PESAPAL_CONSUMER_SECRET', 'PESAPAL_ENVIRONMENT', 'PESAPAL_IPN_URL');
    }

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error('\n❌ ENVIRONMENT VALIDATION FAILED\n');
        console.error('Missing required environment variables:');
        missing.forEach(key => console.error(`  - ${key}`));
        console.error('\nPlease check your .env.local or .env.production file');
        console.error('Copy .env.local.example to .env.local and fill in your values\n');

        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate JWT_SECRET length
    const jwtSecret = process.env.JWT_SECRET!;
    if (jwtSecret.length < 32) {
        console.warn('\n⚠️  WARNING: JWT_SECRET should be at least 32 characters for security\n');
    }

    // Validate Pesapal environment (if Pesapal is configured)
    if (process.env.PESAPAL_ENVIRONMENT) {
        const pesapalEnv = process.env.PESAPAL_ENVIRONMENT;
        if (pesapalEnv !== 'sandbox' && pesapalEnv !== 'production') {
            throw new Error('PESAPAL_ENVIRONMENT must be either "sandbox" or "production"');
        }
    }

    // Validate MongoDB URI format
    const mongoUri = process.env.MONGODB_URI!;
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
        throw new Error('MONGODB_URI must be a valid MongoDB connection string');
    }

    // Warn about localhost in production
    if (isProd && mongoUri.includes('localhost')) {
        console.warn('\n⚠️  WARNING: Using localhost MongoDB in production environment!\n');
    }

    // Warn if Pesapal not configured in development
    if (!isProd && (!process.env.PESAPAL_CONSUMER_KEY || !process.env.PESAPAL_CONSUMER_SECRET)) {
        console.warn('\n⚠️  Pesapal not configured. Payment features will not work.');
        console.warn('    Get Pesapal credentials from https://www.pesapal.com/\n');
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
        console.warn('\n⚠️  GOOGLE_CLIENT_ID not configured. Google Login will likely fail.');
        console.warn('    Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local\n');
    }

    console.log('✅ Environment validation passed\n');

    return {
        MONGODB_URI: mongoUri,
        JWT_SECRET: jwtSecret,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        PESAPAL_CONSUMER_KEY: process.env.PESAPAL_CONSUMER_KEY || 'not_configured',
        PESAPAL_CONSUMER_SECRET: process.env.PESAPAL_CONSUMER_SECRET || 'not_configured',
        PESAPAL_ENVIRONMENT: (process.env.PESAPAL_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
        PESAPAL_IPN_URL: process.env.PESAPAL_IPN_URL || 'http://localhost:5000/api/payments/ipn',
        PORT: process.env.PORT,
        NODE_ENV: process.env.NODE_ENV,
        FRONTEND_URL: process.env.FRONTEND_URL
    };
}

/**
 * Gets a safe display version of environment config (secrets masked)
 */
export function getEnvironmentSummary(): Record<string, string> {
    const maskSecret = (value: string | undefined): string => {
        if (!value) return 'NOT_SET';
        if (value === 'not_configured') return 'NOT_CONFIGURED';
        if (value.length < 8) return '***';
        return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
    };

    return {
        MONGODB_URI: maskSecret(process.env.MONGODB_URI),
        JWT_SECRET: maskSecret(process.env.JWT_SECRET),
        PESAPAL_CONSUMER_KEY: maskSecret(process.env.PESAPAL_CONSUMER_KEY),
        PESAPAL_ENVIRONMENT: process.env.PESAPAL_ENVIRONMENT || 'NOT_SET',
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || '5000'
    };
}
