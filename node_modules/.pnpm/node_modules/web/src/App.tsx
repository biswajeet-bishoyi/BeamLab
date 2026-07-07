
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/workspace" replace />} />
        <Route path="/workspace" element={<WorkspaceLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
