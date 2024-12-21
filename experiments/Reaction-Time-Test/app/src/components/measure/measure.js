import HorizontalContainer from '../containers/H-container.js';

import { useState } from 'react';





function MeasureSection() {


    const [color, setColor] = useState("");
    const [appState, setAppState] = useState("welcome");
    const [reactionTime, setReactionTime] = useState(0);
    const [reactionTimes, setReactionTimes] = useState([]);
    const [reactionTimeAverage, setReactionTimeAverage] = useState(0);
    
    function WelcomeScreen() {
        return (
            <div className="welcomeCard" onClick={() => setAppState("measure")}>
                <p className='textBasic'>The card changes color and you tap/click on the card as soon as it changes color. This will measure your reaction time.</p>
                <p className='textBasic'>Tap the card to start a trial run. There will be two colors flashes : Red and Blue. </p>
                {/* <button className='textButton selectButton'>Start</button> */}
            </div>
        );
    }
    
    function MeasureCard({color, onClick}) {
        return (
            <div className="measureCard" style={{backgroundColor: color}} onClick={onClick}></div>
        );
    }

    function reportReactionTime() {
        return (
            <div className="reactionTimeReport">
                <p className='textBasic'>Your reaction time was {reactionTime} milliseconds.</p>
                <p className='textBasic'>Your average reaction time is {reactionTimeAverage} milliseconds.</p>
                <p className='textBasic'>Your reaction times are {reactionTimes.join(", ")}.</p>
            </div>
        );
    }


  return (
    <div className="measureCard" style={{backgroundColor: color}} >
        {appState === "welcome" && <WelcomeScreen />}
        {appState === "measure" && <MeasureCard color={color} onClick={() => setColor("rgba(0, 0, 255, 1)")} />}
    </div>
  );
}

export default MeasureSection;