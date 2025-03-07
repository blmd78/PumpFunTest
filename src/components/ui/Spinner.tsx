import React from 'react';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'medium' }) => {
  const sizeClasses = {
    small: 'w-[3rem] h-4',
    medium: 'w-[5rem] h-6',
    large: 'w-[7rem] h-8'
  };

  return (
    <div className="flex justify-center items-center">
      {/* <div
        className={`animate-spin rounded-full border-t-2 border-b-2 border-blue-500 border-opacity-50 w-6 h-6 ${sizeClasses[size]}`}
        style={{
          borderImage: 'linear-gradient(to right, #4F46E5, #818CF8) 1',
        }}
      ></div> */}
      <div
        className={`animate-spin border-opacity-50 w-[5rem] h-6 ${sizeClasses[size]}`}
        // style={{
        //   borderImage: 'linear-gradient(to right, #4F46E5, #818CF8) 1',
        // }}
      >
        <img src="/loader.png" alt="likeaser logo" className="w-[5rem] h-6" />
      </div>
    </div>
  );
};

export default Spinner;