import MainLayout from './components/Layout/MainLayout';
import { DrawingProvider } from './context/DrawingContext';

function App() {
  return (
    <DrawingProvider>
      <MainLayout />
    </DrawingProvider>
  );
}

export default App;
