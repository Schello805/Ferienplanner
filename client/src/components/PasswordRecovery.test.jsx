import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PasswordRecovery } from './PasswordRecovery.jsx';
import { AuthScreen } from './AuthScreen.jsx';
import { requestJson } from '../lib/api.js';

vi.mock('../lib/api.js', () => ({ requestJson: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('password recovery', () => {
  it('is accessible from the login screen and sends the email address', async () => {
    requestJson.mockResolvedValue({ message: 'Bitte prüfe dein Postfach.' });
    render(<AuthScreen setupRequired={false} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Passwort vergessen?' }));
    fireEvent.change(screen.getByLabelText('E-Mail-Adresse'), { target: { value: 'max@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Link anfordern' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Bitte prüfe dein Postfach.');
    expect(JSON.parse(requestJson.mock.calls[0][1].body)).toEqual({ email: 'max@example.com' });
    fireEvent.click(screen.getByRole('button', { name: 'Zurück zur Anmeldung' }));
    expect(screen.getByLabelText('Benutzername')).toBeInTheDocument();
  });

  it('removes the token from the URL and submits it only with matching passwords', async () => {
    window.history.replaceState(null, '', '/passwort-zuruecksetzen#token=secret-token');
    requestJson.mockResolvedValue({ username: 'max' });
    render(<PasswordRecovery reset />);
    expect(window.location.hash).toBe('');
    fireEvent.change(screen.getByLabelText('Neues Passwort'), { target: { value: 'newsecret123' } });
    fireEvent.change(screen.getByLabelText('Passwort wiederholen'), { target: { value: 'different123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Passwort speichern' }));
    expect(screen.getByRole('alert')).toHaveTextContent('stimmen nicht überein');
    expect(requestJson).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Passwort wiederholen'), { target: { value: 'newsecret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Passwort speichern' }));
    expect(await screen.findByRole('status')).toHaveTextContent('max');
    expect(requestJson).toHaveBeenCalledWith('/api/auth/reset-password', expect.objectContaining({ body: JSON.stringify({ token: 'secret-token', newPassword: 'newsecret123' }) }));
  });

  it('shows errors and allows another request', async () => {
    requestJson.mockRejectedValue(new Error('Bitte später erneut versuchen.'));
    render(<PasswordRecovery />);
    fireEvent.change(screen.getByLabelText('E-Mail-Adresse'), { target: { value: 'max@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Link anfordern' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Bitte später');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Link anfordern' })).not.toBeDisabled());
  });

  it('does not submit when the token is missing', () => {
    render(<PasswordRecovery reset />);
    expect(screen.getByRole('alert')).toHaveTextContent('Der Link fehlt');
    expect(screen.queryByRole('button', { name: 'Passwort speichern' })).not.toBeInTheDocument();
  });
});
