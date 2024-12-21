import React from 'react';
import Logo from './logo/psychometric-logo.js';
import './header.css';

const Header = ({ appTheme, setAppTheme, appName, appTagline }) => {
  const themeIcon = appTheme === "light" ? "fa fa-sun" : "fa fa-moon";

  return (
    <header className="App-header p-md-5 p-4 pb-2 pb-md-2">
      <div className="themeSwitch mr-2 float-right">
        <div onClick={() => setAppTheme(appTheme === "light" ? "dark" : "light")}>
          <i className={themeIcon}></i>
        </div>
      </div>
      <div className=' d-flex align-items-center'>
        <div className="Logo p-1">
          <Logo />
        </div>
        <div className="AppNameGroup p-md-1 p-3 pt-4 pt-md-0 ml-1 pl-1 pl-md-1 mr-2 ml-md-3">
          <div className="AppName">{appName}</div>
          <div className="AppTagline">{appTagline}</div>
        </div>
      </div>

      
    </header>
  );
}

export default Header;
