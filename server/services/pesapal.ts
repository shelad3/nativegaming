/**
 * Pesapal Payment Gateway Integration
 * 
 * Handles payment processing through Pesapal for African markets.
 * Supports M-Pesa, Airtel Money, and card payments.
 */

import axios from 'axios';
import crypto from 'crypto';

interface PesapalConfig {
    consumerKey: string;
    consumerSecret: string;
    environment: 'sandbox' | 'production';
    ipnUrl: string;
}

interface PaymentRequest {
    userId: string;
    amount: number;
    currency: string;
    description: string;
    email: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
}

interface PaymentResponse {
    paymentUrl: string;
    transactionId: string;
    orderTrackingId: string;
}

interface IPNNotification {
    pesapal_merchant_reference: string;
    pesapal_transaction_tracking_id: string;
    pesapal_notification_type: string;
}

export class PesapalService {
    private config: PesapalConfig;
    private baseUrl: string;
    private accessToken: string | null = null;
    private tokenExpiry: number | null = null;

    constructor() {
        this.config = {
            consumerKey: process.env.PESAPAL_CONSUMER_KEY || '',
            consumerSecret: process.env.PESAPAL_CONSUMER_SECRET || '',
            environment: (process.env.PESAPAL_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
            ipnUrl: process.env.PESAPAL_IPN_URL || ''
        };

        // Set base URL based on environment
        this.baseUrl = this.config.environment === 'production'
            ? 'https://pay.pesapal.com/v3'
            : 'https://cybqa.pesapal.com/pesapalv3';

        if (!this.config.consumerKey || !this.config.consumerSecret) {
            console.warn('⚠️  Pesapal credentials not configured. Payment processing will not work.');
        }
    }

    /**
     * Authenticate with Pesapal and get access token
     */
    private async authenticate(): Promise<string> {
        // Check if we have a valid token
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const response = await axios.post(`${this.baseUrl}/api/Auth/RequestToken`, {
                consumer_key: this.config.consumerKey,
                consumer_secret: this.config.consumerSecret
            });

            this.accessToken = response.data.token;

            // Tokens typically expire after 5 minutes, refresh after 4 minutes
            this.tokenExpiry = Date.now() + (4 * 60 * 1000);

            console.log('✅ Pesapal authentication successful');
            return this.accessToken;
        } catch (error: any) {
            console.error('❌ Pesapal authentication failed:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Pesapal');
        }
    }

    /**
     * Register IPN URL with Pesapal
     * Should be called on server startup
     */
    async registerIPN(): Promise<void> {
        try {
            const token = await this.authenticate();

            const response = await axios.post(
                `${this.baseUrl}/api/URLSetup/RegisterIPN`,
                {
                    url: this.config.ipnUrl,
                    ipn_notification_type: 'GET' // or 'POST' based on preference
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Pesapal IPN registered:', response.data);
        } catch (error: any) {
            console.error('❌ Failed to register IPN:', error.response?.data || error.message);
            // Don't throw - server should still start even if IPN registration fails
        }
    }

    /**
     * Create a payment request and get checkout URL
     */
    async createPaymentRequest(payment: PaymentRequest): Promise<PaymentResponse> {
        try {
            const token = await this.authenticate();

            // Generate unique merchant reference
            const merchantReference = `PN_${Date.now()}_${payment.userId}`;

            // Convert amount to major units if it's sent as cents (e.g. 499 -> 4.99)
            // Pesapal expects amount in decimal format for the specific currency
            let finalAmount = payment.amount;
            if (finalAmount > 100 && Number.isInteger(finalAmount)) {
                finalAmount = finalAmount / 100;
            }

            const requestData = {
                id: merchantReference,
                currency: payment.currency || 'USD',
                amount: finalAmount,
                description: payment.description,
                callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback`,
                notification_id: await this.getIPNId(),
                billing_address: {
                    email_address: payment.email,
                    phone_number: payment.phoneNumber || '',
                    country_code: 'KE',
                    first_name: payment.firstName || 'User',
                    last_name: payment.lastName || 'Account'
                }
            };

            const response = await axios.post(
                `${this.baseUrl}/api/Transactions/SubmitOrderRequest`,
                requestData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const { order_tracking_id, merchant_reference, redirect_url } = response.data;

            console.log('✅ Payment request created:', merchant_reference);

            return {
                paymentUrl: redirect_url,
                transactionId: merchant_reference,
                orderTrackingId: order_tracking_id
            };
        } catch (error: any) {
            console.error('❌ Failed to create payment request:', error.response?.data || error.message);
            throw new Error('Failed to initiate payment');
        }
    }

    /**
     * Get IPN ID (needed for transaction submission)
     */
    private async getIPNId(): Promise<string> {
        try {
            const token = await this.authenticate();

            const response = await axios.get(
                `${this.baseUrl}/api/URLSetup/GetIpnList`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            // Get the first IPN ID from the list
            const ipnList = response.data;
            if (ipnList && ipnList.length > 0) {
                return ipnList[0].ipn_id;
            }

            // If no IPN registered, register one
            await this.registerIPN();

            // Retry getting IPN list
            const retryResponse = await axios.get(
                `${this.baseUrl}/api/URLSetup/GetIpnList`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            return retryResponse.data[0]?.ipn_id || '';
        } catch (error) {
            console.warn('⚠️  Could not get IPN ID, continuing without it');
            return '';
        }
    }

    /**
     * Verify transaction status
     */
    async verifyTransaction(orderTrackingId: string): Promise<any> {
        try {
            const token = await this.authenticate();

            const response = await axios.get(
                `${this.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const status = response.data;
            console.log('📊 Transaction status:', status);

            return {
                status: status.payment_status_description,
                amount: status.amount,
                currency: status.currency,
                paymentMethod: status.payment_method,
                isCompleted: status.payment_status_description === 'Completed',
                merchantReference: status.merchant_reference,
                message: status.message
            };
        } catch (error: any) {
            console.error('❌ Failed to verify transaction:', error.response?.data || error.message);
            throw new Error('Failed to verify transaction status');
        }
    }

    /**
     * Handle IPN notification from Pesapal
     */
    async handleIPNNotification(notification: IPNNotification): Promise<any> {
        const { pesapal_transaction_tracking_id } = notification;

        try {
            // Verify the transaction status
            const status = await this.verifyTransaction(pesapal_transaction_tracking_id);

            console.log('📬 IPN notification processed:', status);

            return status;
        } catch (error) {
            console.error('❌ Failed to process IPN notification:', error);
            throw error;
        }
    }
}

// Singleton instance
export const pesapalService = new PesapalService();
