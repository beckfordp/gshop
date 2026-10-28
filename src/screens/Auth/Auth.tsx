import { useEffect, useRef, useState } from 'react';
import { AuthError, signIn, signUp } from '../../services/mockAuth';
import {
  validateSignIn,
  validateSignUp,
  type AuthFormErrors,
  type AuthFormValues,
} from '../../services/authValidation';
import type { AuthSession } from '../../services/authTypes';
import './Auth.css';

interface AuthProps {
  onAuthenticated: (session: AuthSession) => void;
  onBack: () => void;
  initialMode?: 'signin' | 'signup';
}

type Mode = 'signin' | 'signup';

const EMPTY_FORM: AuthFormValues = {
  email: '',
  password: '',
  confirmPassword: '',
};

export default function Auth({
  onAuthenticated,
  onBack,
  initialMode = 'signin',
}: AuthProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [values, setValues] = useState<AuthFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const validate = (): AuthFormErrors =>
    mode === 'signup' ? validateSignUp(values) : validateSignIn(values);

  useEffect(() => {
    if (submitted) {
      setErrors(validate());
    }
    // `validate` only reads mode/values; re-run when either changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, mode, submitted]);

  useEffect(() => {
    if (formError) {
      alertRef.current?.focus();
    }
  }, [formError]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setValues(EMPTY_FORM);
    setErrors({});
    setFormError('');
    setSubmitted(false);
  };

  const update = (field: keyof AuthFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setSubmitted(true);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setTimeout(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      }, 0);
      return;
    }

    setFormError('');
    setSubmitting(true);
    try {
      const session =
        mode === 'signup'
          ? await signUp(values.email, values.password)
          : await signIn(values.email, values.password);
      onAuthenticated(session);
    } catch (error) {
      setFormError(
        error instanceof AuthError
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <h1 ref={headingRef} id="auth-title" tabIndex={-1}>
        {mode === 'signin' ? 'Sign in' : 'Create account'}
      </h1>
      <p className="auth__intro">
        Sign in before checkout so your orders are tied to you.
      </p>

      <div className="auth__tabs" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          className="auth__tab"
          onClick={() => switchMode('signin')}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          className="auth__tab"
          onClick={() => switchMode('signup')}
        >
          Create account
        </button>
      </div>

      <form ref={formRef} className="auth__form" noValidate onSubmit={handleSubmit}>
        {formError && (
          <div ref={alertRef} className="auth__alert" role="alert" tabIndex={-1}>
            {formError}
          </div>
        )}

        <div className="auth-field">
          <label className="auth-field__label" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            className="auth-field__input"
            type="email"
            autoComplete="email"
            value={values.email}
            disabled={submitting}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'auth-email-error' : undefined}
            onChange={(event) => update('email', event.target.value)}
          />
          {errors.email && (
            <p className="auth-field__error" id="auth-email-error">
              {errors.email}
            </p>
          )}
        </div>

        <div className="auth-field">
          <label className="auth-field__label" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            className="auth-field__input"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={values.password}
            disabled={submitting}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'auth-password-error' : undefined}
            onChange={(event) => update('password', event.target.value)}
          />
          {errors.password && (
            <p className="auth-field__error" id="auth-password-error">
              {errors.password}
            </p>
          )}
        </div>

        {mode === 'signup' && (
          <div className="auth-field">
            <label className="auth-field__label" htmlFor="auth-confirm-password">
              Confirm password
            </label>
            <input
              id="auth-confirm-password"
              className="auth-field__input"
              type="password"
              autoComplete="new-password"
              value={values.confirmPassword}
              disabled={submitting}
              aria-invalid={errors.confirmPassword ? true : undefined}
              aria-describedby={
                errors.confirmPassword ? 'auth-confirm-error' : undefined
              }
              onChange={(event) => update('confirmPassword', event.target.value)}
            />
            {errors.confirmPassword && (
              <p className="auth-field__error" id="auth-confirm-error">
                {errors.confirmPassword}
              </p>
            )}
          </div>
        )}

        <button className="auth__submit" type="submit" disabled={submitting}>
          {submitting
            ? mode === 'signup'
              ? 'Creating account...'
              : 'Signing in...'
            : mode === 'signup'
              ? 'Create account'
              : 'Sign in'}
        </button>
        <button
          className="auth__back"
          type="button"
          onClick={onBack}
          disabled={submitting}
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
