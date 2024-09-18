import React, { useEffect } from 'react'

const ContentBody = () => {
  const [textArea, setTextArea] = React.useState(null);

  useEffect(() => {
    const textarea = document.querySelector('textarea');
    setTextArea(textarea);
    console.log('textarea:', textarea);
  }, []);
  
  const handleClick = () => {
    if (textArea) {
      // Update the textarea value
      textArea.value = "XDDDD";
  
      // Trigger native input and change events
      const event = new Event('input', { bubbles: true });
      textArea.dispatchEvent(event);
  
      const changeEvent = new Event('change', { bubbles: true });
      textArea.dispatchEvent(changeEvent);
  
      // Optionally: Focus the textarea and move the cursor to the end
      textArea.focus();
      textArea.setSelectionRange(textArea.value.length, textArea.value.length);
    }
  };

  return (
    <div>
      <button onClick={handleClick}>Button 1</button>
      <button>Button 2</button>
    </div>
  );
};

export default ContentBody;