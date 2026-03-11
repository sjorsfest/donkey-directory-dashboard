async function enableSidePanelOnActionClick() {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

chrome.runtime.onInstalled.addListener(() => {
  void enableSidePanelOnActionClick();
});

chrome.runtime.onStartup.addListener(() => {
  void enableSidePanelOnActionClick();
});

void enableSidePanelOnActionClick();
