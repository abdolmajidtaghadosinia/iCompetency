import React from 'react';

// Full-screen frame shared by every game result screen. Results live in the
// same immersive layer as GameShell (instead of dropping back into the page
// next to the sidebar), and the frame scrolls, so the submit button can't be
// clipped off the bottom of a short phone screen.
const ResultOverlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex p-4 animate-fade-in">
    <div className="m-auto w-full flex justify-center py-4">{children}</div>
  </div>
);

export default ResultOverlay;
