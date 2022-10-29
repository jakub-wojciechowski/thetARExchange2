import React from 'react';
import "./SearchFrame.css";

/*
 * @props prompt: string. Place holder for input frame.
 * @props onSearch(searchContent: string): function. 
 * @props(option) initInput: string. Default input string set to input frame.
*/
export const SearchFrame = (props) => {
  const [searchInput, setSearchInput] = React.useState(props.initInput ? props.initInput : "");

  const hashIcon = (
		<svg role="img" xmlns="http://www.w3.org/2000/svg" width="32px" height="32px" viewBox="0 0 24 24" aria-labelledby="searchIconTitle" stroke="#ffffff" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter" fill="none" color="#ffffff"> <title id="searchIconTitle">Search</title> <path d="M14.4121122,14.4121122 L20,20"/> <circle cx="10" cy="10" r="6"/> </svg>
	)

  function onSearchInputChange(e) {
    let input = e.target.value;
    setSearchInput(input);
  }

  function onSearchRequested() {
	  if (props.onSearch) {
      props.onSearch(searchInput);
	  }
	}

  return (
	  <div className="searchInput">
		<div className="searchIcon"> {hashIcon} </div>
		<input placeholder={props.prompt} value={searchInput} onChange={onSearchInputChange} spellCheck="false"/>
		<div className="searchButton">
		  <button className="submitButton"
			onClick={onSearchRequested}
			disabled={false}
			>
			Search
		  </button>
		</div>
	  </div>
	)
}