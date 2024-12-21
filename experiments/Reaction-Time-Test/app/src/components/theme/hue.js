import React from 'react';

const ThemeHues = ({ themeColorHue, setThemeColorHue }) => {
  return (
    <style>
        {`
            :root {
            --themeColorHue: ${themeColorHue};
            }
        `}
    </style>
  );
}

export default ThemeHues;