/**
 * Centralized User-Friendly Error Normalizer for StudyArena Web.
 * Maps raw technical errors (Axios, status codes, network errors, timeouts)
 * into short, professional, human-readable user messages.
 * 
 * NEVER displays raw technical stack traces or backend internals to users.
 * ALWAYS logs technical details to console.error() for developer debugging.
 */
export function getUserFriendlyError(error, context = '') {
  // Always log full technical error for developers in dev tools
  if (error) {
    console.error(`[StudyArena Error] Context: "${context || 'general'}"`, error);
  }

  if (!error) {
    return 'Something went wrong. Please try again.';
  }

  // Handle string errors safely
  if (typeof error === 'string') {
    const isTechnical = /Axios|Mongo|TypeError|ReferenceError|SyntaxError|HTTP|500|Brevo|Cheerio|ECONN/i.test(error);
    if (!isTechnical && error.length < 120) {
      return error;
    }
    return 'Something went wrong. Please try again.';
  }

  // Network / Offline errors
  if (
    error.code === 'ERR_NETWORK' ||
    error.message?.includes('Network Error') ||
    (typeof window !== 'undefined' && !window.navigator?.onLine)
  ) {
    return 'We couldn\'t connect to StudyArena. Please check your internet connection and try again.';
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
    return 'The request took too long. Please try again.';
  }

  // Handle HTTP status codes from Axios / Fetch
  const status = error.response?.status;
  const backendMsg = error.response?.data?.message;

  // Filter out any raw technical messages coming from backend
  const isSafeMessage =
    backendMsg &&
    typeof backendMsg === 'string' &&
    backendMsg.length < 150 &&
    !/Axios|Mongo|HTTP|ReferenceError|TypeError|Cheerio|SyntaxError|CastError|ValidationError|object|Brevo|ECONN|stack/i.test(
      backendMsg
    );

  if (isSafeMessage) {
    return backendMsg;
  }

  // Status Code Mapping
  switch (status) {
    case 400:
      if (context === 'auth_register') return 'Please check the information you entered and try again.';
      if (context === 'auth_otp') return 'That verification code isn\'t correct. Please check it and try again.';
      return 'Please check the information entered and try again.';

    case 401:
      if (context === 'auth_login') return 'Your email or password is incorrect. Please try again.';
      if (context === 'portal_connect') return 'The SRM Portal credentials you entered are incorrect.';
      return 'Your session has expired. Please log in again.';

    case 403:
      return 'You don\'t have permission to perform this action.';

    case 404:
      if (context === 'auth_verify') return 'Account not found. Please register again.';
      return 'We couldn\'t find what you\'re looking for.';

    case 409:
      return 'This email is already registered. Try logging in instead.';

    case 422:
      return 'Please check the information entered and try again.';

    case 429:
      return 'Too many attempts. Please wait a moment and try again.';

    case 500:
    case 502:
    case 503:
    case 504:
      if (context === 'portal_sync' || context === 'portal_connect') {
        return 'The SRM Portal is temporarily unavailable. Please try again later.';
      }
      if (context === 'auth_register' || context === 'email_verify') {
        return 'We couldn\'t send the verification email. Please try again shortly.';
      }
      return 'Something went wrong on our side. Please try again shortly.';

    default:
      break;
  }

  // Context-specific safe defaults
  switch (context) {
    case 'auth_register':
      return 'We couldn\'t create your account. Please try again.';
    case 'auth_login':
      return 'Unable to log in. Please check your details and try again.';
    case 'auth_otp':
      return 'Verification failed. Please check the code and try again.';
    case 'portal_connect':
    case 'portal_sync':
      return 'We couldn\'t connect to the SRM Portal right now. Please try again.';
    case 'subject_create':
      return 'We couldn\'t add this subject. Please try again.';
    case 'subject_update':
      return 'We couldn\'t update this subject. Please try again.';
    case 'subject_delete':
      return 'We couldn\'t delete this subject. Please try again.';
    case 'syllabus_upload':
      return 'We couldn\'t upload the syllabus. Please try again.';
    case 'profile_update':
      return 'We couldn\'t save your profile. Please try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
