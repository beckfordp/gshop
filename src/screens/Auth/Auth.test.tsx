import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Auth from './Auth';
import { authGateway } from '../../services/authGateway';

vi.mock('../../services/authGateway', () => ({
  authGateway: { signup: vi.fn(), login: vi.fn() },
}));

const signup = vi.mocked(authGateway.signup);
const login = vi.mocked(authGateway.login);

const EMAIL = 'ada@example.com';
const PASSWORD = 'correct horse';
const SESSION = {
  user: { userId: 'user-1', email: EMAIL },
  token: 'token-1',
};

function renderAuth(props: Partial<Parameters<typeof Auth>[0]> = {}) {
  return render(
    <Auth
      onAuthenticated={props.onAuthenticated ?? vi.fn()}
      onBack={props.onBack ?? vi.fn()}
      initialMode={props.initialMode}
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
    signup.mockReset();
    login.mockReset();
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
    expect(login).not.toHaveBeenCalled();
  });

  it('signs up through the gateway and reports the session', async () => {
    signup.mockResolvedValue(SESSION);
    const onAuthenticated = vi.fn();
    renderAuth({ onAuthenticated });
    fireEvent.click(screen.getByRole('tab', { name: 'Create account' }));

    fill({ email: EMAIL, password: PASSWORD, confirmPassword: PASSWORD });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(SESSION));
    expect(signup).toHaveBeenCalledWith(EMAIL, PASSWORD);
  });

  it('shows the gateway error for a duplicate account', async () => {
    signup.mockRejectedValue(
      new Error('An account with this email already exists'),
    );
    renderAuth();
    fireEvent.click(screen.getByRole('tab', { name: 'Create account' }));

    fill({ email: EMAIL, password: PASSWORD, confirmPassword: PASSWORD });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists',
    );
  });

  it('shows the generic message for a wrong password', async () => {
    login.mockRejectedValue(new Error('Email or password is incorrect'));
    renderAuth();

    fill({ email: EMAIL, password: 'wrong password' });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email or password is incorrect',
    );
  });

  it('logs in through the gateway and reports the session', async () => {
    login.mockResolvedValue({
      ...SESSION,
      refreshToken: 'refresh-1',
    });
    const onAuthenticated = vi.fn();
    renderAuth({ onAuthenticated });

    fill({ email: EMAIL, password: PASSWORD });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
    expect(login).toHaveBeenCalledWith(EMAIL, PASSWORD);
  });

  it('calls onBack without authenticating', () => {
    const onBack = vi.fn();
    renderAuth({ onBack });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onBack).toHaveBeenCalledOnce();
    expect(signup).not.toHaveBeenCalled();
    expect(login).not.toHaveBeenCalled();
  });

  it('respects initialMode', () => {
    renderAuth({ initialMode: 'signup' });

    expect(
      screen.getByRole('heading', { name: 'Create account' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
  });
});
