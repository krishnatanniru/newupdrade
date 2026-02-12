// Razorpay Payment Service
// For production, order creation should be done on the backend
// This is a client-side implementation for demo purposes

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number; // in paise
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface PaymentDetails {
  amount: number; // in rupees
  currency: string;
  name: string;
  description: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: Record<string, string>;
}

// Load Razorpay script dynamically
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      console.log('Razorpay SDK already loaded');
      resolve(true);
      return;
    }
    
    console.log('Loading Razorpay SDK...');
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      console.log('Razorpay SDK loaded successfully');
      resolve(true);
    };
    script.onerror = (e) => {
      console.error('Failed to load Razorpay SDK:', e);
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

// Initialize Razorpay payment
export const initializePayment = async (
  paymentDetails: PaymentDetails,
  apiKey: string,
  onSuccess: (response: RazorpayResponse) => void,
  onError: (error: any) => void
): Promise<void> => {
  console.log('Initializing payment with key:', apiKey.substring(0, 10) + '...');
  
  const isLoaded = await loadRazorpayScript();
  
  if (!isLoaded) {
    onError(new Error('Failed to load Razorpay SDK'));
    return;
  }

  if (!apiKey) {
    onError(new Error('Razorpay API key is not configured'));
    return;
  }
  
  console.log('Razorpay window object:', window.Razorpay ? 'Available' : 'Not available');

  const options: RazorpayOptions = {
    key: apiKey,
    amount: paymentDetails.amount * 100, // Convert to paise
    currency: paymentDetails.currency || 'INR',
    name: paymentDetails.name,
    description: paymentDetails.description,
    handler: (response: RazorpayResponse) => {
      onSuccess(response);
    },
    prefill: {
      name: paymentDetails.customerName,
      email: paymentDetails.customerEmail,
      contact: paymentDetails.customerPhone,
    },
    notes: paymentDetails.notes || {},
    theme: {
      color: '#3b82f6', // Blue color matching the app
    },
  };

  try {
    const razorpay = new (window as any).Razorpay(options);
    
    razorpay.on('payment.failed', (response: any) => {
      onError(response.error || new Error('Payment failed'));
    });

    razorpay.open();
  } catch (error) {
    onError(error);
  }
};

// Verify payment signature (should be done on backend in production)
export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean => {
  // In production, this should be done on the backend
  // This is a placeholder for client-side verification
  console.warn('Payment signature verification should be done on the backend');
  return true;
};

// Generate a unique order ID for tracking
export const generateOrderId = (): string => {
  return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Format amount for display
export const formatAmount = (amount: number, currency: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};
