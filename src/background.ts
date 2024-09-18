import { v4 as uuidv4 } from 'uuid';

function initialSetup() {
  console.log("Initial setup started.");
  // Fetch the latest version from GitHub
  fetch(
    "https://raw.githubusercontent.com/bSienkiewicz/Nest/master/public/manifest.json"
  )
    .then((response) => response.text())
    .then((text) => JSON.parse(text))
    .then((githubManifest) => {
      const githubVersion = githubManifest.version;

      // Get the local extension's manifest version
      const localManifest = chrome.runtime.getManifest();
      const localVersion = localManifest.version;

      // Compare the versions
      if (githubVersion !== localVersion) {
        console.log(
          `New version available: ${githubVersion}. Current version: ${localVersion}.`
        );
        chrome.storage.local.set({
          latest_version: githubVersion,
          update_available: true,
        });
      } else {
        console.log("You have the latest version.");
        chrome.storage.local.set({ update_available: false });
      }
    })
    .catch((error) => {
      console.error("Error fetching manifest.json from GitHub:", error);
    });

  // Initialize default settings if not already done
  chrome.storage.local.get("initialized", (result) => {
    if (result.initialized) return;

    const defaultMessages = [
      {
        position: 0,
        title: "Severities",
        id: uuidv4(),
        messages: [
          { title: "Severity 3", message: createMessage(3), id: uuidv4(), position: 0 },
          { title: "Severity 2", message: createMessage(2), id: uuidv4(), posiiton: 1 },
          { title: "Severity 1", message: createMessage(1), id: uuidv4(), position: 2 },
        ],
      },
      // Additional categories can be added here
    ];
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

function createMessage(severity) {
  return `Hi Team,

Thank you for raising a case with us. 
Your query was categorized as Sev ${severity}. 
We will analyze the issue and provide more information. 
Please wait for our feedback.`;
}
