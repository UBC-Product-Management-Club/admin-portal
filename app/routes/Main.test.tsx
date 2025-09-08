import { useAuth0 } from '@auth0/auth0-react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useRevalidator } from 'react-router';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import Main from './Main';
import userEvent from '@testing-library/user-event';

vi.mock('@auth0/auth0-react');

describe('Main component', () => {
  let mockLogin: Mock;
  let mockUseLocation: Mock;

  beforeEach(() => {
    mockUseLocation = vi.fn();
    mockLogin = vi.fn();
    vi.mocked(useAuth0, { partial: true }).mockReturnValue({
      loginWithRedirect: mockLogin,
    });
  });

  async function renderComponent(state?: any) {
    render(
      <MemoryRouter initialEntries={[{ state }]}>
        <Main />
      </MemoryRouter>
    );
  }

  it('can login', async () => {
    const user = userEvent.setup();
    await renderComponent();

    expect(screen.getByText('PMC Admin Portal')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();

    await act(() => user.click(screen.getByRole('button', { name: 'Login' })));

    expect(mockLogin).toHaveBeenCalled();
  });

  it('renders with other state', async () => {
    await renderComponent({ hello: 'world' });

    expect(screen.getByText('PMC Admin Portal')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.queryByText('hello')).not.toBeInTheDocument();
    expect(screen.queryByText('world')).not.toBeInTheDocument();
  });

  it('renders with error state', async () => {
    await renderComponent({ error: 'invalid request', description: 'auth error!' });

    expect(screen.getByText('PMC Admin Portal')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('invalid request')).toBeInTheDocument();
    expect(screen.getByText('auth error!')).toBeInTheDocument();
  });
});
