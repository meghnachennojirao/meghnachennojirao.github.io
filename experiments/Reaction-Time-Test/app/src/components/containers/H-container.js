import React from 'react';


function HorizontalContainer({children, id, hsProps}) {
    const handleMoveLeft = () => {
        window.ignusTheme.hsMoveLeft('#' + id, 70);
      };
    
      const handleMoveRight = () => {
        window.ignusTheme.hsMoveRight('#' + id, 70);
      };
  return (
    <div className="H-container">
        <div className="hs-container-outer-ignus ">
            <div className="d-none d-sm-flex hs-container-left-button-ignus" onClick={handleMoveLeft} style={hsProps.leftArrowHolderStyle}>
                <i className="fa fa-angle-left" style={hsProps.leftArrowStyle}></i>
            </div>
            <div className="d-none d-sm-flex hs-container-right-button-ignus" onClick={handleMoveRight} style={hsProps.rightArrowHolderStyle}>
                <i className="fa fa-angle-right" style={hsProps.rightArrowStyle}></i>
            </div>
            <div id={id} className="hs-container-inner-ignus" style={hsProps.innerContainerStyle}>

                {React.Children.map(children, (child, index) => (
                    <div className="hs-container-element-ignus" key={index}>
                    {child}
                    </div>
                ))}   
                
            </div>
        </div>
    </div>
  );
}


export default HorizontalContainer;