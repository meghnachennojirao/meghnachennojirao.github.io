import { useEffect } from 'react';

function LightTheme() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/css/theme/light.css';
    link.id = 'theme-stylesheet';

    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return null;
}

export default LightTheme;
