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

### Text Expansion Feature

The extension includes a TextExpander-like functionality that works with your existing templates:

1. **Add Aliases**: Edit any template and add an alias (e.g., "elo", "sw", "7d", "s3")
2. **Use Aliases**: Type `;alias` followed by Enter in any text field to expand the text

**Example**:
- Edit "Hello Team" template and add alias "elo"
- Type `;elo` + Enter in any text field
- The text will be replaced with the full "Hello Team" message

**Default Aliases**:
- `;sw` → "Started working" template
- `;7d` → "7 days inactive" template  
- `;elo` → "Hello Team" template
- `;s3` → "Severity 3" template

**Usage**: You can either click the template button to fill the entire comment, or use the alias to expand just that text anywhere.

## Known Issues

- _**missing required field: [ParentId]**_: This error may occur when
  interacting with a case comment that wasn't opened directly from the case
  screen. **To resolve this, close the Case Comment tab and reopen it from the
  case screen.**

## Contributing

This extension was developed as an internal tool, but contributions are welcome.
Please feel free to open issues or submit pull requests if you have improvements
or bug fixes.
