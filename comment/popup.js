let tabvalue = null; // Declare tabvalue globally and initialize it

// Initialize popup UI on load
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Check if user info is already saved
    chrome.storage.sync.get("userInfo", (data) => {
      if (data.userInfo) {
        console.log("User is already signed in:", data.userInfo);

        // Hide "Sign In" button and show "Activate Split Screen"
        document.getElementById("signIn").style.display = "none";
        document.getElementById("activateSplitScreen").style.display = "block";

        // Optionally greet the user
        const userGreeting = document.getElementById("userGreeting");
        if (userGreeting) {
          userGreeting.textContent = `Welcome, ${data.userInfo.name || data.userInfo.email}!`;
        }
      } else {
        console.log("User is not signed in. Displaying Sign In button.");
        document.getElementById("signIn").style.display = "block";
        document.getElementById("activateSplitScreen").style.display = "none";
      }
    });
  } catch (error) {
    console.error("Error initializing popup UI:", error);
  }
});

// Open side panel
document.getElementById("activateSplitScreen").addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      tabvalue = tab.id;
      console.log(`Active tab ID set to: ${tabvalue}`);

      // Attempt to open the side panel
      await chrome.sidePanel.open({ tabId: tabvalue });
      console.log("Side panel opened successfully");
    } else {
      console.error("No active tab found");
    }
  } catch (error) {
    console.error("Error handling side panel:", error);
  }

  // Save tab ID in storage
  chrome.storage.sync.set({ sharedData: tabvalue });
});

// Fetch OAuth token
async function getOAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve(token);
      }
    });
  });
}

// Fetch user info from Google
async function fetchUserInfo(token) {
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching user info:", error);
    throw error;
  }
}

// Handle sign-in
document.getElementById("signIn").addEventListener("click", async () => {
  try {
    const token = await getOAuthToken();
    console.log("OAuth token retrieved successfully:", token);

    const userInfo = await fetchUserInfo(token);
    if (!userInfo || !userInfo.name) {
      throw new Error("Invalid user info retrieved");
    }

    // Save user info in storage for later use
    chrome.storage.sync.set({ userInfo }, () => {
      console.log("User info saved:", userInfo);
    });

    // Update UI for signed-in user
    document.getElementById("signIn").style.display = "none";
    document.getElementById("activateSplitScreen").style.display = "block";

    // Optionally greet the user
    const userGreeting = document.getElementById("userGreeting");
    if (userGreeting) {
      userGreeting.textContent = `Welcome, ${userInfo.name || userInfo.email}!`;
    }

    alert(`Welcome, ${userInfo.name || userInfo.email}!`);
  } catch (error) {
    alert("Sign-in failed. Please try again.");
    console.error("Error during sign-in:", error);
  }
});
