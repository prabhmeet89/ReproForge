import { Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/app/*"
        element={
          <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">App Shell Placeholder</h2>
            <p className="text-sm text-gray-400 max-w-md">
              The full authenticated dashboard experience connects here in Sub-step 1C.
            </p>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
