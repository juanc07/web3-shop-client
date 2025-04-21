// src/components/Footer.tsx
const Footer = () => {
  return (
    <footer className="bg-primary-light dark:bg-primary-dark text-text-dark dark:text-text-light w-full py-6 mt-auto">
      <div className="w-full px-4 text-center">
        <p className="text-sm sm:text-base">© 2025 Web3 Shop. All rights reserved.</p>
        <div className="mt-2 flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
          <a href="#" className="hover:text-gray-500 dark:hover:text-gray-400 text-sm sm:text-base">Privacy Policy</a>
          <a href="#" className="hover:text-gray-500 dark:hover:text-gray-400 text-sm sm:text-base">Terms of Service</a>
          <a href="#" className="hover:text-gray-500 dark:hover:text-gray-400 text-sm sm:text-base">Contact Us</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;