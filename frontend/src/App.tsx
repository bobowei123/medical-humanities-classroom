import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AnimatedRoutes } from "@/components/AnimatedRoutes";
import { PageTransition } from "@/components/PageTransition";
import Home from "./pages/Home";
import TeacherHome from "./pages/TeacherHome";
import TeacherConsole from "./pages/TeacherConsole";
import StudentJoin from "./pages/StudentJoin";
import StudentRoom from "./pages/StudentRoom";
import NotFound from "./pages/NotFound";

/**
 * Configure TanStack Query client with optimized defaults
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 课堂数据需要实时刷新，这里设置较短的新鲜期
      staleTime: 5 * 1000,
      // Cache data for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry failed requests once
      retry: 1,
      // Don't refetch on window focus by default
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect by default
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster richColors position="top-center" />
      <BrowserRouter>
        <AnimatedRoutes>
          <Route path="/" data-genie-title="医学人文智慧课堂" data-genie-key="Home" element={<PageTransition transition="fade"><Home /></PageTransition>} />
          <Route path="/teacher" data-genie-title="教师端" data-genie-key="TeacherHome" element={<PageTransition transition="slide-up"><TeacherHome /></PageTransition>} />
          <Route path="/teacher/:classroomId" data-genie-title="教师控制台" data-genie-key="TeacherConsole" element={<PageTransition transition="fade"><TeacherConsole /></PageTransition>} />
          <Route path="/student" data-genie-title="学员端" data-genie-key="StudentJoin" element={<PageTransition transition="slide-up"><StudentJoin /></PageTransition>} />
          <Route path="/student/:classroomId" data-genie-title="课堂答题" data-genie-key="StudentRoom" element={<PageTransition transition="slide-up"><StudentRoom /></PageTransition>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" data-genie-key="NotFound" data-genie-title="Not Found" element={<PageTransition transition="fade"><NotFound /></PageTransition>} />
        </AnimatedRoutes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App
