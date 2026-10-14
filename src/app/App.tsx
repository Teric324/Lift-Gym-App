import { SettingsScreen } from '../features/settings/SettingsScreen';
import { en } from '../i18n/en';

// Navigation arrives with the next steps; for now the app shows the Settings screen.
export function App() {
  return (
    <main>
      <header>
        <strong>{en.appName}</strong>
      </header>
      <SettingsScreen />
    </main>
  );
}
