import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  lng: typeof localStorage === 'undefined' ? 'en' : (localStorage.getItem('pension_seva_lang') || 'en'),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  resources: {
    en: { translation: {
      otp: {
        tagline: 'Check. Apply. Track. Get Support.', title_registration: 'Verify Your Account',
        title_login: 'Verify Your Login', title_forgot: 'Verify Your Identity',
        title_change: 'Confirm Your Change', title_application: 'Verify Your Application',
        title_generic: 'Verify Your Identity', description: 'Enter the 6-digit code sent to your email.',
        sent: 'OTP sent to {{destination}}', verify: 'Verify OTP', verifying: 'Verifying…',
        resend: 'Resend OTP', sending: 'Sending…', resend_wait: 'Resend OTP in {{seconds}} seconds',
        expires: 'OTP expires in {{time}}', expired: 'OTP has expired. Request a new code.',
        wrong: 'Incorrect OTP. Please check the code and try again.', locked: 'Too many attempts. Request a new code after the waiting period.',
        success: 'Verification Successful', continuing: 'Continuing…', speak: 'Read instructions aloud',
        restart: 'Start over', session_missing: 'This verification session is missing or expired. Start the action again.',
        email_only: 'Codes are sent by email. SMS verification is not supported.',
        unavailable: 'Unable to verify OTP. Something went wrong. Please try again.'
      }
    }},
    ta: { translation: {
      otp: {
        tagline: 'சரிபார்க்கவும். விண்ணப்பிக்கவும். கண்காணிக்கவும். உதவி பெறவும்.',
        title_registration: 'உங்கள் கணக்கைச் சரிபார்க்கவும்', title_login: 'உள்நுழைவைச் சரிபார்க்கவும்',
        title_forgot: 'உங்கள் அடையாளத்தைச் சரிபார்க்கவும்', title_change: 'மாற்றத்தை உறுதிப்படுத்தவும்',
        title_application: 'விண்ணப்பத்தைச் சரிபார்க்கவும்', title_generic: 'உங்கள் அடையாளத்தைச் சரிபார்க்கவும்',
        description: 'உங்கள் மின்னஞ்சலுக்கு அனுப்பிய 6 இலக்கக் குறியீட்டை உள்ளிடவும்.',
        sent: '{{destination}} என்ற முகவரிக்கு OTP அனுப்பப்பட்டது', verify: 'OTP-ஐ சரிபார்க்கவும்',
        verifying: 'சரிபார்க்கிறது…', resend: 'OTP-ஐ மீண்டும் அனுப்பவும்', sending: 'அனுப்புகிறது…',
        resend_wait: '{{seconds}} விநாடிகளில் மீண்டும் அனுப்பலாம்', expires: '{{time}}-இல் OTP காலாவதியாகும்',
        expired: 'OTP காலாவதியானது. புதிய குறியீட்டைக் கோரவும்.',
        wrong: 'OTP தவறானது. குறியீட்டைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
        locked: 'பலமுறை தவறாக முயற்சித்துள்ளீர்கள். காத்திருந்து புதிய குறியீட்டைக் கோரவும்.',
        success: 'சரிபார்ப்பு வெற்றிகரமாக முடிந்தது', continuing: 'தொடர்கிறது…',
        speak: 'வழிமுறைகளை உரக்கப் படிக்கவும்', restart: 'மீண்டும் தொடங்கவும்',
        session_missing: 'சரிபார்ப்பு அமர்வு இல்லை அல்லது காலாவதியானது. செயலை மீண்டும் தொடங்கவும்.',
        email_only: 'குறியீடுகள் மின்னஞ்சல் வழியாக அனுப்பப்படும். SMS சரிபார்ப்பு ஆதரிக்கப்படவில்லை.',
        unavailable: 'OTP-ஐ சரிபார்க்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
      }
    }}
  }
});

export default i18n;
