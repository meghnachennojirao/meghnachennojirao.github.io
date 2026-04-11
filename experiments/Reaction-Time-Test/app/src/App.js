
import './App.css';
import React, { useState, useEffect } from 'react';
import './css/ignus-theme.css'
import LightTheme from './components/theme/light.js';
import DarkTheme from './components/theme/dark.js';
import ThemeHues from './components/theme/hue.js';
import Header from './components/header/header.js'

import MeasureSection from './components/measure/measure.js';


function App() {
  
  const [appTheme, setAppTheme] = useState("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("appTheme") || "light";
    setAppTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem("appTheme", appTheme);
  }, [appTheme]);

  const themeVariables = appTheme === "light" ? <LightTheme /> : <DarkTheme />;


  const themeHueOptions = [198, 210, 270, 320];
  const themeHue = themeHueOptions[Math.floor(Math.random() * themeHueOptions.length)];

  const [themeColorHue, setThemeColorHue] = useState(themeHue);

  const appName = "Reaction Time Test";
  const appTagline = "Fastest finger first?!";



  return (
    <div className="App p-0 p-md-0">
      <div id="themeData">
        {themeVariables}
        <ThemeHues themeColorHue={themeColorHue} setThemeColorHue={setThemeColorHue} />
      </div>
      <div className="App-base">
        <Header appTheme={appTheme} setAppTheme={setAppTheme} appName={appName} appTagline={appTagline} />
        <MeasureSection />
      </div>
    </div>
  );
}

export default App;
