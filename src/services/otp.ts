import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from './firebase';

export interface OTPService {
  setupRecaptcha(containerId: string): Promise<RecaptchaVerifier | null>;
  sendOTP(phone: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult | null>;
}

// Set up Recaptcha which is required by Firebase Phone Auth
const setupRecaptcha = async (containerId: string): Promise<RecaptchaVerifier | null> => {
  if (!auth) return null;
  try {
    const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      }
    });
    return recaptchaVerifier;
  } catch (error) {
    console.error('Failed to setup recaptcha:', error);
    return null;
  }
};

// Send SMS via Firebase
const sendOTP = async (phone: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult | null> => {
  if (!auth) return null;
  try {
    console.log(`[Firebase SMS] Sending OTP to ${phone}`);
    const confirmationResult = await signInWithPhoneNumber(auth, phone, appVerifier);
    return confirmationResult;
  } catch (error) {
    console.error('Failed to send OTP via Firebase:', error);
    return null;
  }
};

export const otpService = {
  setupRecaptcha,
  sendOTP
};
