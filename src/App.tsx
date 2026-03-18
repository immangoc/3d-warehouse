import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Warehouse3D } from './pages/Warehouse3D';
import { Warehouse2D } from './pages/Warehouse2D';
import { ColdStorage } from './pages/ColdStorage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/3d" replace />} />
        <Route path="/3d" element={<Warehouse3D />} />
        <Route path="/2d" element={<Warehouse2D />} />
        <Route path="/cold-storage" element={<ColdStorage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
