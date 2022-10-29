import React from 'react';
import "./SubmitButton.css";

/*
 * @props buttonText: string.
 * @props submitTask: async function. Will be executed when button clicked.
 * @props buttonSize: string. Large | Medium | Small.
 * @props disabled: boolean.
 * @props(option) onFailed: function. Will be executed if submitTask returns {status: false, ...}
 * @props(option) onSuccess: function. Will be executed if submitTask returns {status: true, ...}
*/
export const SubmitButton = (props) => {
    const [disabled, setDisabled] = React.useState(false);
    const [submitResult, setSubmitResult] = React.useState("");
    const [buttonText, setButtonText] = React.useState(props.buttonText);

    async function onButtonClicked() {
      setDisabled(true);
      setSubmitResult("");
      setButtonText(props.buttonText+' ...');
      props.submitTask().then(ret => {
        console.log('onButtonClicked ret: ', ret);
        setDisabled(false);
        setSubmitResult(ret.result);
        setButtonText(props.buttonText);
        if (ret.status === false) {
          if (props.onFailed) {
            props.onFailed(ret);
          }
          return;
        } else {
          if (props.onSuccess) {
            props.onSuccess(ret);
          }
        }
      });
    }
    
    return (
      <>
        {submitResult !== '' &&
          <div className='centerResult'>
            <div className="darkRow">{submitResult}</div>
          </div>
        }
        <div className='centerButton'>
          <button className={`submitButton${props.buttonSize}`} disabled={props.disabled===true?true:disabled} onClick={onButtonClicked}>{buttonText}</button>
        </div>
      </>
    );
}