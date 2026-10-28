import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Auth from './Auth';
import { getSession, signUp } from '../../services/mockAuth';

const EMAIL = 'ada@example.com';
const PASSWORD = 'correct horse';

function renderAuth(props: Partial<Parameters<typeof Auth>[0]> = {}) {
  return render(
    <Auth
      onAuthenticated={props.onAuthenticated ?? vi.fn()}
      onBack={props.onBack ?? vi.fn()}
    />,
  );
}

function fill(values: {
  email?: string;
  password?: string;
  confirmPassword?: string;
}) {
  if (values.email !== undefined) {
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: values.email },
    });
  }
  if (values.password !== undefined) {
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: values.password },
    });
  }
  if (values.confirmPassword !== undefined) {
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: values.confirmPassword },
    });
  }
}

describe('Auth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts on sign in and toggles to create account', () => {
    renderAuth();

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Create account' }));

    expect(
      screen.getByRole('heading', { name: 'Create account' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
  });

  it('validates the form and focuses the first invalid field', async () => {
    renderAuth();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email address')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveFocus());
  });

  it('signs up, stores the session, and reports the user', async () => {
    const onAuthenticated = vi.fn();
    renderAuth({ onAuthenticated });
    fireEvent.click(screen.getByRole('tab', { name: 'Create account' }));

    fill({ email: EMAIL, password: PASSWORD, confirmPassword: PASSWORD });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
    expect(onAuthenticated.mock.calls[0][0].user.email).toBe(EMAIL);
    expect(getSession()?.user.email).toBe(EMAIL);
  });

  it('rejects a duplicate account with a form-level error', async () => {
    await signUp(EMAIL, PASSWORD);
    renderAuth();
    fireEvent.click(screen.getByRole('tab', { name: 'Create account' }));

    fill({ email: EMAIL, password: PASSWORD, confirmPassword: PASSWORD });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('An account with this email already exists');
  });

  it('rejects a wrong password with the generic message', async () => {
    await signUp(EMAIL, PASSWORD);
    renderAuth();

    fill({ email: EMAIL, password: 'wrong password' });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email or password is incorrect',
    );
  });

  it('signs in an existing user and reports them', async () => {
    const created = await signUp(EMAIL, PASSWORD);
    const onAuthenticated = vi.fn();
    renderAuth({ onAuthenticated });

    fill({ email: EMAIL, password: PASSWORD });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
    expect(onAuthenticated.mock.calls[0][0].user).toEqual(created.user);
  });

  it('calls onBack without authenticating', () => {
    const onBack = vi.fn();
    renderAuth({ onBack });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onBack).toHaveBeenCalledOnce();
  });

  it('respects initialMode', () => {
    render(
      <Auth
        onAuthenticated={vi.fn()}
        onBack={vi.fn()}
        initialMode="signup"
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Create account' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
  });
});
