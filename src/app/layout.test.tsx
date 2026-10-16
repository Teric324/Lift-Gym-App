// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Layout } from './Layout';

// The update hook pulls in the service worker module, which only exists in a Vite build.
vi.mock('../features/pwa/update', () => ({
  useUpdateAvailable: () => false,
  applyUpdate: () => undefined,
}));

afterEach(cleanup);

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<p>Workouts page</p>} />
          <Route path="history" element={<p>History page</p>} />
          <Route path="exercises" element={<p>Exercises page</p>} />
          <Route path="settings" element={<p>Settings page</p>} />
          <Route path="session" element={<p>Workout page</p>} />
          <Route path="session/:exerciseId" element={<p>Exercise page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const tabs = () => within(screen.getByRole('navigation', { name: 'Main' }));

describe('app shell', () => {
  it('has a bottom navigation with four tabs, in order, each with an icon and a short label', () => {
    renderAt('/');
    const links = tabs().getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual([
      'Workouts',
      'History',
      'Exercises',
      'Settings',
    ]);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/',
      '/history',
      '/exercises',
      '/settings',
    ]);
    // Every tab has a line icon (decorative: the label names it).
    for (const link of links) expect(link.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
  });

  it('the navigation is a bar of its own, after the page, not inside the top bar', () => {
    renderAt('/');
    const bar = screen.getByRole('navigation', { name: 'Main' });
    expect(bar.classList.contains('tabbar')).toBe(true);
    const header = document.querySelector('header.app-header')!;
    expect(header.contains(bar)).toBe(false);
    const main = document.querySelector('main.app-main')!;
    expect(main.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('marks the tab of the current page as active, and only that one', () => {
    renderAt('/history');
    expect(screen.getByText('History page')).toBeTruthy();
    const active = tabs()
      .getAllByRole('link')
      .filter((a) => a.getAttribute('aria-current') === 'page');
    expect(active.map((a) => a.textContent)).toEqual(['History']);
  });

  it('Workouts is active only on the home page, not on every page', () => {
    renderAt('/settings');
    const workouts = tabs().getByRole('link', { name: 'Workouts' });
    expect(workouts.getAttribute('aria-current')).toBeNull();
    expect(tabs().getByRole('link', { name: 'Settings' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it.each(['/session', '/session/abc'])(
    'Workouts stays active on the workout in progress (%s)',
    (path) => {
      renderAt(path);
      const active = tabs()
        .getAllByRole('link')
        .filter((a) => a.getAttribute('aria-current') === 'page');
      expect(active.map((a) => a.textContent)).toEqual(['Workouts']);
      expect(tabs().getByRole('link', { name: 'Workouts' }).classList.contains('active')).toBe(
        true,
      );
    },
  );

  it('tapping a tab shows its page and moves the active mark', () => {
    renderAt('/');
    fireEvent.click(tabs().getByRole('link', { name: 'Exercises' }));
    expect(screen.getByText('Exercises page')).toBeTruthy();
    expect(tabs().getByRole('link', { name: 'Exercises' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(tabs().getByRole('link', { name: 'Workouts' }).getAttribute('aria-current')).toBeNull();
  });

  it('the top bar shows the LIFT wordmark and links home', () => {
    renderAt('/settings');
    const brand = document.querySelector(
      'header.app-header a.app-header__brand',
    ) as HTMLAnchorElement;
    expect(brand.getAttribute('href')).toBe('/');
    expect(within(brand).getByRole('img', { name: 'LIFT' })).toBeTruthy();
    fireEvent.click(brand);
    expect(screen.getByText('Workouts page')).toBeTruthy();
  });
});
