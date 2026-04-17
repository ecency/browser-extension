import React, { useMemo } from 'react';
import { AnimatedKeeper } from 'src/common-ui/animated-keeper/animated-keeper.component';

export const SplashscreenComponent = () => {
  return useMemo(() => {
    return (
      <div className="splashscreen">
        <div className="overlay">
          <div className="top"></div>
          <div className="bottom"></div>
        </div>
        <AnimatedKeeper className="logo" width={120} height={120} />
        <div className="loading-animation-container">
          <div className="ball first"></div>
          <div className="ball second"></div>
          <div className="ball third"></div>
        </div>
      </div>
    );
  }, []);
};
