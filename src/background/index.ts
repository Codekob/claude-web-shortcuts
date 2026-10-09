// Clicking the toolbar icon opens the shortcut editor.
chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});
