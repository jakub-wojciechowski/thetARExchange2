import React from 'react';
import "./TextInput.css";
import TextareaAutosize from 'react-textarea-autosize';

/*
 * @props title: string.
 * @props tip: string | DOM.
 * @props onChange: function(string).
 * @props(option) placeholder: string.
 * @props(option) default: string. The default value.
*/
export const TextInput = (props) => {
  const [text, setText] = React.useState(props.default ? props.default : "");

  function onTextChange(value) {
    props.onChange(value);
    setText(value);
  }

  return (
    <div className='textDiv'>
      <div className='title'> {props.title} </div>
      <TextareaAutosize
        className='textarea'
        value={text}
        onChange={e => onTextChange(e.target.value)}
        rows="1" 
        placeholder={props.placeholder}
      />
      <div className='tip'> {props.tip} </div>
    </div>
  );
}