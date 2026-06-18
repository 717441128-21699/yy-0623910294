import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProjectList from "@/pages/ProjectList";
import Timeline from "@/pages/Timeline";
import Report from "@/pages/Report";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/project/:id" element={<Timeline />} />
        <Route path="/project/:id/report" element={<Report />} />
      </Routes>
    </Router>
  );
}
