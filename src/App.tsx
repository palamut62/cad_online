import MainLayout from './components/Layout/MainLayout';
import { DrawingProvider } from './context/DrawingContext';
import { AIProvider } from './context/AIContext';

function App() {
  return (
    <DrawingProvider>
      <AIProvider>
        <MainLayout />
      </AIProvider>
    </DrawingProvider>
  );
}

export default App;
