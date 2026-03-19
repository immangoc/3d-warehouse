import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WarehouseOverview } from './pages/WarehouseOverview';
import { Warehouse3D } from './pages/Warehouse3D';
import { Warehouse2D } from './pages/Warehouse2D';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/tong-quan" replace />} />
        <Route path="/tong-quan" element={<WarehouseOverview />} />
        <Route path="/3d" element={<Warehouse3D />} />
        <Route path="/2d" element={<Warehouse2D />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
