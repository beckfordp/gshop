// Pure auth-form validation for the prototype signup/login screen. Kept out
// of the component so the rules are testable without React.

export interface AuthFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return 'Enter your email address';
  }
  return EMAIL_PATTERN.test(email.trim())
    ? undefined
    : 'Enter a valid email address';
}

export function validateSignUp(values: AuthFormValues): AuthFormErrors {
  const errors: AuthFormErrors = {};
  const email = validateEmail(values.email);
  if (email) {
    errors.email = email;
  }

  if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords must match';
  }

  return errors;
}

export function validateSignIn(
  values: Pick<AuthFormValues, 'email' | 'password'>,
): AuthFormErrors {
  const errors: AuthFormErrors = {};
  const email = validateEmail(values.email);
  if (email) {
    errors.email = email;
  }

  if (!values.password) {
    errors.password = 'Enter your password';
  }

  return errors;
}
