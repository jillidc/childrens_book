import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Upload from './screens/Upload';
import Loading from './screens/Loading';
import Story from './screens/Story';
import Done from './screens/Done';
import Library from './screens/Library';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/loading" element={<Loading />} />
          <Route path="/story" element={<Story />} />
          <Route path="/done" element={<Done />} />
          <Route path="/library" element={<Library />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;