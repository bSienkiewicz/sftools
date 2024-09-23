import { v4 as uuidv4 } from "uuid";

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
          message:
            "Hello Team,\n\nPlease note that I will be closing this case due to the absence of feedback for more than 5 days.\nShould any further investigation be required, kindly open a new case instead of reopening the current one.",
          posiiton: 1,
          title: "7 days inactive",
        },
        {
          id: uuidv4(),
          message: "Hello Team,\n\n",
          position: 2,
          title: "Hello Team",
        },
      ],
      position: 0,
      title: "Comments",
    },
  ];
};

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
