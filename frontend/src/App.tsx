import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import ReviewDetail from "./pages/ReviewDetail";
import ReviewHistory from "./pages/ReviewHistory";
import ReviewCompare from "./pages/ReviewCompare";
import { Toaster } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
          }}
        />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/review/:id" element={<ReviewDetail />} />
          <Route path="/history" element={<ReviewHistory />} />
          <Route path="/compare" element={<ReviewCompare />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
