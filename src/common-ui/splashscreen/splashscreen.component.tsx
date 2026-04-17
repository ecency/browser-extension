import React, { useMemo } from 'react';

export const SplashscreenComponent = () => {
  return useMemo(() => {
    return (
      <div className="splashscreen">
        <div className="overlay">
          <div className="top"></div>
          <div className="bottom"></div>
        </div>
        <img
          className="logo"
          src="/assets/images/keeper-logo-200.png"
          alt="Hive Keeper"
        />
        <div className="loading-animation-container">
          <div className="ball first"></div>
          <div className="ball second"></div>
          <div className="ball third"></div>
        </div>
      </div>
    );
  }, []);
};
