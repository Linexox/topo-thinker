import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SessionsList from "@/pages/SessionsList";
import SessionDetail from "@/pages/SessionDetail";
import Settings from "@/pages/Settings";
import CustomFontLoader from "@/components/CustomFontLoader";

export default function App() {
  return (
    <Router>
      <CustomFontLoader />
      <Routes>
        <Route path="/" element={<Navigate to="/sessions" replace />} />
        <Route path="/sessions" element={<SessionsList />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/sessions" replace />} />
      </Routes>
    </Router>
  );
}
