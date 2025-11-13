import { render, screen } from '@testing-library/react';

import LoginPage from '../(auth)/login/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    refresh: jest.fn()
  }),
  useSearchParams: () => new URLSearchParams()
}));

describe('LoginPage', () => {
  it('renders the login form headline', () => {
    render(<LoginPage />);

    expect(
      screen.getByText('Observe every server from a unified command center.')
    ).toBeInTheDocument();
    expect(screen.getByText('Enter Monitoring Center')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });
});
