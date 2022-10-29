import "./Selector.css";
import React from 'react';
import Select from 'react-select';

/*
 * @props title: string.
 * @props tip: string | DOM.
 * @props options: object. format like: [{value: 'foo', label: 'bar'}, ...]
 * @props onChange: function(string).
*/
export const Selector = (props) => {
  const [text, setText] = React.useState("");

  function onTextChange(e) {
    props.onChange(e.value);
    setText(e);
  }

  return (
    <div className='textDiv'>
      <div className='title'> {props.title} </div>
      <Select
        className='select'
        value={text}
        options={props.options}
        onChange={e => onTextChange(e)}
      />
      <div className='tip'> {props.tip} </div>
    </div>
  );
}