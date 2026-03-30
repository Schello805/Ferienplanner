import { fireEvent, render, screen } from '@testing-library/react';
import { AuthScreen } from './AuthScreen';

describe('AuthScreen', () => {
  it('shows a status notice when the server is unavailable', () => {
    render(
      <AuthScreen
        setupRequired={false}
        loading={false}
        onSubmit={vi.fn()}
        statusNotice={{
          tone: 'error',
          title: 'Server aktuell nicht erreichbar',
          message: 'Bitte später erneut versuchen.',
        }}
      />
    );

    expect(screen.getByText('Server aktuell nicht erreichbar')).toBeInTheDocument();
    expect(screen.getByText('Bitte später erneut versuchen.')).toBeInTheDocument();
  });

  it('validates register mode before submitting', async () => {
    const onSubmit = vi.fn();

    render(<AuthScreen setupRequired={false} loading={false} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Registrieren' }));
    fireEvent.change(screen.getByLabelText('Benutzername'), { target: { value: 'michael' } });
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'passwort123' } });
    fireEvent.change(screen.getByLabelText('Passwort wiederholen'), { target: { value: 'passwort123' } });

    fireEvent.click(screen.getAllByRole('button', { name: /^Registrieren$/ })[1]);

    expect(await screen.findByText('Bitte E-Mail-Adresse angeben.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed credentials in login mode', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<AuthScreen setupRequired={false} loading={false} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Benutzername'), { target: { value: ' michael ' } });
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'geheim' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Anmelden$/ })[1]);

    expect(onSubmit).toHaveBeenCalledWith({
      mode: 'login',
      username: 'michael',
      email: '',
      password: 'geheim',
    });
  });
});
