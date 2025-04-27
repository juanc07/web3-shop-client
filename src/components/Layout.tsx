// src/components/Layout.tsx
import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { Toaster } from "@/components/ui/sonner";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-6">
        {children}
      </main>
      <Footer />
      <Toaster richColors position="top-right" duration={3000} />
    </div>
  );
};

export default Layout;