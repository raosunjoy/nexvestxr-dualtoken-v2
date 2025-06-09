import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="bg-blue-600 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">NexVestXR</Link>
        <nav className="space-x-4">
          <Link to="/dashboard" className="hover:underline">Dashboard</Link>
          <Link to="/dual-token" className="hover:underline">Dual Token</Link>
          <Link to="/xera" className="hover:underline">XERA</Link>
          <Link to="/propx-marketplace" className="hover:underline">PROPX</Link>
          <Link to="/trading" className="hover:underline">Trade</Link>
          <Link to="/developer-dashboard" className="hover:underline">Developer</Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;