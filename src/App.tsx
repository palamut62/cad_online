import MainLayout from './components/Layout/MainLayout';
import { DrawingProvider } from './context/DrawingContext';
import { AIProvider } from './context/AIContext';
import { NotificationProvider } from './context/NotificationContext';

function App() {
  return (
    <DrawingProvider>
      <AIProvider>
        <NotificationProvider>
          <MainLayout />
        </NotificationProvider>
      </AIProvider>
    </DrawingProvider>
  );
}

export default App;
