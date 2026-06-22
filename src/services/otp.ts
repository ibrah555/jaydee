// OTP Service - generates and sends OTP via SMS
// For production, integrate with Twilio, Firebase, or AWS SNS

export interface OTPService {
  generateOTP(): string;
  sendOTP(phone: string, otp: string): Promise<boolean>;
  verifyOTP(otp: string, expectedOtp: string): boolean;
}

// Simple OTP generator (6 digits)
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Mock SMS sender - in production use Twilio or Firebase
const sendSMS = async (phone: string, otp: string): Promise<boolean> => {
  try {
    // Placeholder: In production, call your SMS provider API
    console.log(`[SMS] Sending OTP ${otp} to ${phone}`);
    
    // For demo, simulate sending to a webhook or service
    // const response = await fetch('/api/send-otp', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ phone, otp })
    // });
    // return response.ok;
    
    // For now, always return true in development
    return true;
  } catch (error) {
    console.error('Failed to send OTP:', error);
    return false;
  }
};

const verifyOTP = (otp: string, expectedOtp: string): boolean => {
  return otp === expectedOtp;
};

export const otpService = {
  generateOTP,
  sendSMS,
  verifyOTP
};
