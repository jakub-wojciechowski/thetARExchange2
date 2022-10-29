import React from 'react';
import { useEffect } from 'react';
import { ProgressSpinner } from '../ProgressSpinner/ProgressSpinner';
import "./PageLoading.css";

/*
 * @props submitTask: async function. Will be executed when button clicked.
 * @props(option) onSuccess(): function. Will be executed if submitTask returns {status: true, ...}
 * @props(option) counter: number. Increment counter when pageLoader are expected to be called more than one time.
*/
export const PageLoading = (props) => {
  const [isInit, setIsInit] = React.useState(false);
  const [initResult, setInitResult] = React.useState("");

  useEffect(async () => {
    setInitResult("");
    setIsInit(true);
    
    props.submitTask().then(async ret => {
      console.log('page loader: ', ret);
      setIsInit(false);
      if (ret.status === false) {
        setInitResult(ret.result);
        return;
      } else {
        if (props.onSuccess) {
          props.onSuccess();
        }
      }
    });
  }, [props.counter]);

  return (
    <>
      {isInit && <ProgressSpinner />}
      {!isInit && initResult !== '' &&
        <div className='centerResult'>
          <div className="darkRow">{initResult}</div>
        </div>
      }
    </>
  );
}