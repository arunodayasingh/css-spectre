/* background.js */
// Listen for the extension icon click
chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
        // Send a message to the content script to toggle the debug state
        chrome.tabs.sendMessage(tab.id, {
            type: "TOGGLE_SPECTRE"
        }).catch((err) => {
            // If the content script isn't ready (e.g., restricted page), ignore or log
            console.log("Could not toggle CSS Spectre on this tab:", err);
        });
    }
});
