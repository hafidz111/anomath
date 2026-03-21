import AppRouter from './app/router/router';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
}

export default App;
