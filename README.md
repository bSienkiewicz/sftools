# SFTools

Chrome extension designed to simplify the process of managing and inserting
premade messages within Salesforce. Although developed as an internal tool for
our company, the extension works seamlessly with any Salesforce integration.

## Installation

1. Clone or this repository or download and unpack the latest release.
2. Navigate to `chrome://extensions`.
3. Enable **Developer Mode** toggle in the top left/right of your browser.
4. Click on Load unpacked and select the directory where you downloaded/cloned
   the project.
5. You can also drag the `dist` folder into the browser window directly.

## Usage

1. The extension automatically detects Salesforce text areas when interacting
   with case comments.
2. There should be a container with the comment buttons below the text area.
3. You can edit the buttons by clicking the extension icon and navigating
   through the popup configuration.

## Known Issues

- _**missing required field: [ParentId]**_: This error may occur when
  interacting with a case comment that wasn't opened directly from the case
  screen. **To resolve this, close the Case Comment tab and reopen it from the
  case screen.**

## Contributing

This extension was developed as an internal tool, but contributions are welcome.
Please feel free to open issues or submit pull requests if you have improvements
or bug fixes.
