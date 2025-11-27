
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-base-200 shadow-md">
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-3xl font-bold text-white tracking-wider">
          POD <span className="text-brand-primary">Power</span>
        </h1>
        <p className="text-base-content mt-1">Your AI Assistant for Print-On-Demand Success</p>
        <p className="mb-1">Created with ❤️ by <span className="font-bold text-white">Duy Bảo Nguyễn</span></p>
      </div>
    </header>
  );
};
