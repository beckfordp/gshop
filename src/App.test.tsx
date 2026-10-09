import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./screens/Catalog/Catalog', () => ({
  default: () => <div>Catalog screen</div>,
}));

vi.mock('./screens/Cart/Cart', () => ({
  default: () => <div>Cart screen</div>,
}));

describe('App', () => {
  it('renders the Catalog screen by default', () => {
    render(<App />);
    expect(screen.getByText('Catalog screen')).toBeInTheDocument();
  });

  it('switches to the Cart screen via "View Cart" and back via "Back to Catalog"', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'View Cart' }));
    expect(screen.getByText('Cart screen')).toBeInTheDocument();
    expect(screen.queryByText('Catalog screen')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Catalog' }));
    expect(screen.getByText('Catalog screen')).toBeInTheDocument();
    expect(screen.queryByText('Cart screen')).not.toBeInTheDocument();
  });
});
