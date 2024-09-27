import { v4 as uuidv4 } from "uuid";

// GitHub API endpoints
const GH_USERNAME = 'bSienkiewicz'
const GH_REPO = 'sftools'

function defaultMessagesRender (){
  return [
    {
      id: uuidv4(),
      messages: [
        {
          id: uuidv4(),
          message:
            "Hello Team,\n\nThank you for raising a case with us. \nYour query was categorized as Sev 3. \nWe will analyze the issue and provide more information. \nPlease wait for our feedback.",
          position: 0,
          title: "Severity 3",
        },
        {
          id: uuidv4(),
          message: "Hello Team,\n\nThank you for raising a case with us. \nYour query was categorized as Maintenance. \nWe will analyze the issue and provide more information. \nPlease wait for our feedback.",
          position: 1,
          title: "Maintenance",
        },
        {
          id: uuidv4(),
          message:
            "Hello Team,\n\nPlease note that I will be closing this case due to the absence of feedback for more than 5 days.\nShould any further investigation be required, kindly open a new case instead of reopening the current one.",
          posiiton: 2,
          title: "7 days inactive",
        },
      ],
      position: 0,
      title: "Comment templates",
    },
  ];
};

const checkForUpdate = async () => {
  // Get current version from the extension's manifest.json
  const currentVersion = chrome.runtime.getManifest().version;

  // Fetch the latest version from GitHub
  const repoManifestUrl = `https://raw.githubusercontent.com/${GH_USERNAME}/${GH_REPO}/refs/heads/master/manifest.json`;

  try {
    const response = await fetch(repoManifestUrl);
    if (!response.ok) throw new Error('Failed to fetch manifest.json from GitHub');

    const data = await response.json();
    const latestVersion = data.version;

    // Compare versions
    if (currentVersion !== latestVersion) {
      console.log(
        `New version available: ${latestVersion}. Current version: ${currentVersion}.`
      );
      chrome.storage.local.set({
        latest_version: latestVersion,
        update_available: true,
      });
    } else {
      console.log("You have the latest version.");
      chrome.storage.local.set({
        latest_version: latestVersion,
        update_available: false,
      });
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
};

function initialSetup() {
  // Initialize default settings if not already done
  chrome.storage.local.get("initialized", (result) => {
    if (result.initialized) return;

    const defaultMessages = defaultMessagesRender();
    chrome.storage.local.set(
      {
        initialized: true,
        button_messages: defaultMessages,
      },
      () => {
        console.log("Default options set for all severity levels");
      }
    );
  });
}

initialSetup();
checkForUpdate();
