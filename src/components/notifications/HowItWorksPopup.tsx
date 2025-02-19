import React, { useState, useEffect } from 'react';
import { XMarkIcon, LightBulbIcon, CurrencyDollarIcon, ArrowTrendingUpIcon, BanknotesIcon, FireIcon } from '@heroicons/react/24/outline';

const HowItWorksPopup: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem('hasSeenHowItWorksPopup');
    if (!hasSeenPopup) {
      setTimeout(() => setIsVisible(true), 1000);
      localStorage.setItem('hasSeenHowItWorksPopup', 'true');
    }
  }, []);

  if (!isVisible) return null;

  const steps = [
    { icon: LightBulbIcon, text: "Pick a coin you like" },
    { icon: CurrencyDollarIcon, text: "Buy on the bonding curve" },
    { icon: ArrowTrendingUpIcon, text: "Sell anytime for profits/losses" },
    { icon: BanknotesIcon, text: "Curve reaches 0.2 RBTC" },
    { icon: FireIcon, text: "RBTC deposited in Monark & burned" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-3">
      <div className="bg-[#1B1B28] rounded-lg shadow-2xl relative overflow-hidden w-full max-w-xs sm:max-w-sm border border-[#F9F9F9]">
        {/* <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div> */}
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors duration-200"
          aria-label="Close popup"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
        <div className="p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-bold text-[#F7931A] mb-2 text-center">How It Works</h2>
          <p className="text-[#B3AEAE] mb-4 text-center text-[10px] sm:text-xs">
            likeaser ensures safe, fair-launch tokens with no presale or team allocation.
          </p>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <step.icon className="w-3 h-3 text-white" />
                </div>
                <p className="text-[#B3AEAE] text-[10px] sm:text-xs flex-grow">{step.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsVisible(false)}
              className="bg-[#5252FF] hover:bg-[#333391] text-[#F9F9F9] font-semibold py-2 px-4 rounded-full transition-colors duration-300 text-xs sm:text-sm"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPopup;
