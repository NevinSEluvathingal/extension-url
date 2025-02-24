chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
  });
  
  chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
    try {
      // Fetch the shared data from storage
      const result = await new Promise((resolve) => {
        chrome.storage.sync.get('sharedData', (result) => {
          resolve(result);
        });
      });
  
      console.log('Data received from background storage:', result.sharedData);
      console.log(`Tab ID on update: ${tabId}`); // Log current tab ID
      console.log(`Tracked tab ID: ${result.sharedData}`); // Log the tracked tab value
  
      if (tabId !== result.sharedData) {
        await chrome.sidePanel.setOptions({
          tabId: tabId,
          enabled: false,
        });
        console.log(`Side panel disabled for tab ID: ${tabId}`);
      }
    } catch (error) {
      console.error("Error updating side panel options:", error);
    }
  });
  
  
  