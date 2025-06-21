import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Context from './pages/Context';
import Logs from './pages/Logs';
import Tools from './pages/Tools';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/context" element={<Context />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/tools" element={<Tools />} />
      </Routes>
    </Layout>
  );
}

export default App;