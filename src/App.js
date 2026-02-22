import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './screens/Login';
import Upload from './screens/Upload';
import Loading from './screens/Loading';
import Story from './screens/Story';
import Done from './screens/Done';
import Library from './screens/Library';
import Account from './screens/Account';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/loading" element={<Loading />} />
            <Route path="/story" element={<Story />} />
            <Route path="/done" element={<Done />} />
            <Route path="/library" element={<Library />} />
            <Route path="/account" element={<Account />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
