import { useState } from 'react';
import toast from 'react-hot-toast';

function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function cleanNumber(raw) {
  if (!raw) return null;
  // Extract first phone number from string like "+91-40-12345678" or "040-12345678"
  const match = raw.match(/[\+\d][\d\s\-\.]{7,}/);
  if (!match) return null;
  return match[0].replace(/[\s\-\.]/g, '');
}

export default function CallButton({ contactDetails, centerName, size = 'md', className = '' }) {
  const [showPanel, setShowPanel] = useState(false);
  const [calling, setCalling] = useState(false);

  const number = cleanNumber(contactDetails);
  const displayNumber = contactDetails || 'No number available';

  const handleCall = () => {
    if (!number) {
      toast.error('No phone number available for this center');
      return;
    }
    if (isMobile()) {
      window.location.href = `tel:${number}`;
    } else {
      setShowPanel(true);
    }
  };

  const copyNumber = () => {
    navigator.clipboard.writeText(number || displayNumber);
    toast.success('Number copied to clipboard!');
  };

  const openDialer = () => {
    window.location.href = `tel:${number}`;
    setCalling(true);
    setTimeout(() => setCalling(false), 3000);
  };

  const sizeClasses = {
    sm: 'text-xs py-1 px-2',
    md: 'text-sm py-1.5 px-3',
    lg: 'text-base py-2 px-4',
  };

  return (
    <div className="relative">
      <button
        onClick={handleCall}
        className={`bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${sizeClasses[size]} ${className}`}
      >
        <span>📞</span>
        <span>Call Now</span>
      </button>

      {/* Desktop call panel */}
      {showPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPanel(false)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-green-600 px-5 py-4 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-2">
                🏥
              </div>
              <p className="font-bold text-lg">{centerName}</p>
              <p className="text-green-100 text-sm mt-0.5">Healthcare Center</p>
            </div>

            <div className="p-5">
              {/* Phone number display */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center mb-4">
                <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                <p className="text-2xl font-bold tracking-wider text-gray-800 dark:text-gray-100">
                  {displayNumber}
                </p>
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  onClick={openDialer}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {calling ? (
                    <><span className="animate-pulse">📞</span> Calling...</>
                  ) : (
                    <><span>📞</span> Call {displayNumber}</>
                  )}
                </button>

                <button
                  onClick={copyNumber}
                  className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <span>📋</span> Copy Number
                </button>

                {number && (
                  <a
                    href={`https://wa.me/${number.replace('+', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#20b858] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors block text-center"
                  >
                    <span>💬</span> WhatsApp
                  </a>
                )}
              </div>

              <button
                onClick={() => setShowPanel(false)}
                className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
