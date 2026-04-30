import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './views/Home';
import Creator from './views/Creator';
import Game from './views/Game';
import HostDashboard from './views/HostDashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-dark-900 text-slate-200 font-sans">
        <main className="container mx-auto px-4 py-8 max-w-[1400px]">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/crear" element={<Creator />} />
            <Route path="/jugar/:id" element={<Game />} />
            <Route path="/dashboard/:id" element={<HostDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
