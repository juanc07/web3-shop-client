// src/components/Layout.tsx
import React from 'react';
import Navbar from './Navbar'; // Assuming Navbar is in components folder
import Footer from './Footer'; // Assuming Footer is in components folder
import { Toaster } from "@/components/ui/sonner"; // Assuming sonner is setup via shadcn/ui

// Define the props type, expecting 'children' which will be the page content
interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground">
      <Navbar /> {/* Render Navbar at the top */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {children} {/* Render the page-specific content passed in */}
      </main>
      <Footer /> {/* Render Footer at the bottom */}
      {/* Centralized Toaster */}
      <Toaster richColors position="top-right" duration={3000} />
    </div>
  );
};

export default Layout;