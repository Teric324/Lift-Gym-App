import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ExerciseListScreen } from '../features/exercises/ExerciseListScreen';
import { ExerciseScreen } from '../features/exercises/ExerciseScreen';
import { WorkoutEditorScreen } from '../features/workouts/WorkoutEditorScreen';
import { WorkoutListScreen } from '../features/workouts/WorkoutListScreen';
import { HistoryListScreen } from '../features/history/HistoryListScreen';
import { HistorySessionScreen } from '../features/history/HistorySessionScreen';
import { SessionScreen } from '../features/session/SessionScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { Layout } from './Layout';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<WorkoutListScreen />} />
          <Route path="workouts/:id" element={<WorkoutEditorScreen />} />
          <Route path="exercises" element={<ExerciseListScreen />} />
          <Route path="exercises/:id" element={<ExerciseScreen />} />
          <Route path="history" element={<HistoryListScreen />} />
          <Route path="history/:id" element={<HistorySessionScreen />} />
          <Route path="session" element={<SessionScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
