import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import MainVideoPage from "./videoComponents/MainVideoPage";
import socketConnection from "./webRTCutilities/socketConnection";
import ProDashboard from "./siteComponents/ProDashboard";
import ProMainVideoPage from "./videoComponents/ProMainVideoPage";

function Home() {
  return <h1>Hello, Home Page</h1>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join-video" element={<MainVideoPage />} />
        <Route path="/dashboard" element={<ProDashboard />} />
        <Route path="/join-video-pro" element={<ProMainVideoPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
