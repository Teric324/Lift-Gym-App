import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ExerciseListScreen } from '../features/exercises/ExerciseListScreen';
import { ExerciseScreen } from '../features/exercises/ExerciseScreen';
import { HomePlaceholder } from '../features/home/HomePlaceholder';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { Layout } from './Layout';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePlaceholder />} />
          <Route path="exercises" element={<ExerciseListScreen />} />
          <Route path="exercises/:id" element={<ExerciseScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
