import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import { api } from './api';
import { ApiResponse, SubscriptionPlan } from '@/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('StripeService');

interface PaymentSheetConfig {
  paymentIntent: string;
  ephemeralKey: string;
  customer: string;
  publishableKey: string;
}

export const stripeService = {
  async createSubscription(plan: SubscriptionPlan): Promise<{ subscriptionId: string; clientSecret: string }> {
    logger.info('Creating subscription', { plan });
    const res = await api.post<ApiResponse<{ subscriptionId: string; clientSecret: string }>>(
      '/billing/subscribe',
      { plan },
    );
    if (!res.success || !res.data) throw new Error(res.error ?? 'Subscription creation failed');
    return res.data;
  },

  async getPaymentSheetConfig(): Promise<PaymentSheetConfig> {
    const res = await api.post<ApiResponse<PaymentSheetConfig>>('/billing/payment-sheet');
    if (!res.success || !res.data) throw new Error(res.error ?? 'Payment sheet config failed');
    return res.data;
  },

  async presentPaymentSheet(plan: SubscriptionPlan): Promise<'success' | 'cancelled'> {
    logger.info('Presenting payment sheet', { plan });

    const { clientSecret, paymentIntent, ephemeralKey, customer, publishableKey } =
      await this.preparePaymentSheet(plan);

    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: 'AI YouTube Automation',
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: clientSecret,
      allowsDelayedPaymentMethods: false,
      defaultBillingDetails: {},
    });

    if (initError) throw new Error(initError.message);

    const { error: presentError } = await presentPaymentSheet();
    if (presentError) {
      if (presentError.code === 'Canceled') return 'cancelled';
      throw new Error(presentError.message);
    }

    // Confirm subscription on server
    await api.post('/billing/confirm', { paymentIntent });
    logger.info('Subscription confirmed');
    return 'success';
  },

  private async preparePaymentSheet(plan: SubscriptionPlan) {
    const config = await this.getPaymentSheetConfig();
    const subscription = await this.createSubscription(plan);
    return {
      ...config,
      clientSecret: subscription.clientSecret,
      paymentIntent: subscription.subscriptionId,
    };
  },

  async cancelSubscription(): Promise<void> {
    await api.post('/billing/cancel');
    logger.info('Subscription cancelled');
  },

  async getSubscription(): Promise<{
    plan: SubscriptionPlan;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  }> {
    const res = await api.get<
      ApiResponse<{
        plan: SubscriptionPlan;
        status: string;
        currentPeriodEnd: string;
        cancelAtPeriodEnd: boolean;
      }>
    >('/billing/subscription');
    if (!res.success || !res.data) throw new Error(res.error ?? 'Subscription fetch failed');
    return res.data;
  },

  async getInvoices(): Promise<
    Array<{
      id: string;
      amount: number;
      currency: string;
      date: string;
      pdfUrl: string;
      status: string;
    }>
  > {
    const res = await api.get<
      ApiResponse<
        Array<{
          id: string;
          amount: number;
          currency: string;
          date: string;
          pdfUrl: string;
          status: string;
        }>
      >
    >('/billing/invoices');
    if (!res.success || !res.data) throw new Error(res.error ?? 'Invoice fetch failed');
    return res.data;
  },
};
