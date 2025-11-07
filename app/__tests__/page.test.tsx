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
      screen.getByText('Run confident load tests with control tower clarity.')
    ).toBeInTheDocument();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });
});
