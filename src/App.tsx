import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Moderation from './pages/Moderation';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import BotCode from './pages/BotCode';

export type Page = 'dashboard' | 'moderation' | 'logs' | 'settings' | 'botcode';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'moderation': return <Moderation />;
      case 'logs': return <Logs />;
      case 'settings': return <Settings />;
      case 'botcode': return <BotCode />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      <main className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="p-6 animate-fade-in">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
