import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { useAuthStore } from '@/stores/auth-store';
import { RequireAuth } from './RequireAuth';
import { RequireLearner } from './RequireLearner';
import { RequireTeacher } from './RequireTeacher';

/**
 * The gates in front of every signed-in screen. They are what stops a teacher
 * from opening a mistake review that their own statistics would never show,
 * and what sends a signed-out reader to the login page instead of a broken
 * screen — so each of them is worth one test of the door that must stay shut
 * and one of the door that must open.
 */

const me = (role: 'USER' | 'TEACHER' | 'ADMIN') =>
  http.get(api('/auth/me'), () =>
    HttpResponse.json({
      id: 'u-1',
      email: 'someone@example.com',
      role,
      accountStatus: 'ACTIVE',
      isDemo: false,
      profile: { displayName: 'Олена', username: 'olena' },
      avatar: null,
    }),
  );

/** One protected page behind the given gate, with a visible login page to land on. */
const openBehind = (gate: React.JSX.Element) =>
  renderScreen(
    <Routes>
      <Route element={gate}>
        <Route path="/statistics" element={<p>Сторінка статистики</p>} />
      </Route>
      <Route path="/login" element={<p>Сторінка входу</p>} />
    </Routes>,
    { path: '*', route: '/statistics' },
  );

describe('route guards', () => {
  afterEach(() => useAuthStore.setState({ status: 'loading', accessToken: null }));

  it('sends a signed-out reader to the login page', async () => {
    useAuthStore.setState({ status: 'unauthenticated', accessToken: null });

    openBehind(<RequireAuth />);

    expect(await screen.findByText('Сторінка входу')).toBeInTheDocument();
  });

  it('waits rather than flashing the login page while the session is being restored', () => {
    useAuthStore.setState({ status: 'loading', accessToken: null });

    openBehind(<RequireAuth />);

    expect(screen.queryByText('Сторінка входу')).not.toBeInTheDocument();
    expect(screen.queryByText('Сторінка статистики')).not.toBeInTheDocument();
  });

  it('lets a signed-in reader through', async () => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });

    openBehind(<RequireAuth />);

    expect(await screen.findByText('Сторінка статистики')).toBeInTheDocument();
  });

  it('refuses a teacher a learner-only screen', async () => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
    server.use(me('TEACHER'));

    openBehind(<RequireLearner />);

    expect(await screen.findByText('У вас немає доступу до цієї сторінки.')).toBeInTheDocument();
  });

  it('opens a learner-only screen for a student', async () => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
    server.use(me('USER'));

    openBehind(<RequireLearner />);

    expect(await screen.findByText('Сторінка статистики')).toBeInTheDocument();
  });

  it('keeps a student out of the teacher area, and lets a teacher in', async () => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
    server.use(me('USER'));

    const student = openBehind(<RequireTeacher />);
    expect(await screen.findByText('У вас немає доступу до цієї сторінки.')).toBeInTheDocument();
    student.unmount();

    server.use(me('TEACHER'));
    openBehind(<RequireTeacher />);
    expect(await screen.findByText('Сторінка статистики')).toBeInTheDocument();
  });

  it('refuses rather than guesses when the account cannot be read', async () => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
    server.use(http.get(api('/auth/me'), () => HttpResponse.json({}, { status: 500 })));

    openBehind(<RequireLearner />);

    expect(await screen.findByText('У вас немає доступу до цієї сторінки.')).toBeInTheDocument();
  });
});
