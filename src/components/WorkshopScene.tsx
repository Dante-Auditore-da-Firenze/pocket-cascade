import { useEffect, useState, type CSSProperties } from 'react';

export function WorkshopScene({ theme, stopped }: { theme: 'light' | 'dark'; stopped: boolean }) {
  const [hidden, setHidden] = useState(document.hidden);
  const [clock] = useState(() => {
    const now = new Date();
    return { '--second-offset': `-${now.getSeconds()}s`, '--minute-offset': `-${now.getMinutes() * 60 + now.getSeconds()}s` } as CSSProperties;
  });
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  return <div className="workshop-scene" aria-hidden="true" data-still={stopped || hidden}>
    <div className="workshop-room" style={clock}>
      <img className="workshop-backdrop" src={`./workshop/${theme}.webp`} alt="" width="2400" height="1600" decoding="async" />
      <img className="workshop-part workshop-gear-large" src="./workshop/gear-large.webp" alt="" width="208" height="208" />
      <img className="workshop-part workshop-gear-small" src="./workshop/gear-small.webp" alt="" width="148" height="148" />
      <img className="workshop-part workshop-clock-minute" src="./workshop/clock-minute.webp" alt="" width="332" height="332" />
      <img className="workshop-part workshop-clock-second" src="./workshop/clock-second.webp" alt="" width="332" height="332" />
    </div>
  </div>;
}