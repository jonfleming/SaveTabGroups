const saveButton = document.getElementById("save-button")
const LoadButton = document.getElementById("load-button")

chrome.storage.sync.get("tabgroups", ({ tabgroups }) => {
  changeColor.style.backgroundColor = color;
})

saveButton.addEventListener('click', async () => {
  // get tab groups
  let tabGroups = {}
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log(tabs)
  })

  // for each tab group
  for (let tabGroup in tabgroups) {
    // for each tab in tab group
    for (let tab of tabgroups[tabGroup]) {
      // add tab
      
    }
  }
  
  // save tab groups
  chrome.storage.sync.set({ tabGroups });
});
  
  
loadButton.addEventListener('click', async () => {
  // load tab groups
  chrome.storage.sync.get(['tabGroups'], ({ tabgroups }) => {
    // for each tab group
    for (let tabGroup in tabgroups) {
      // for each tab in tab group
      for (let tab of tabgroups[tabGroup]) {
        // add tab
        
      }
    }
  })

  // close existing tabs

  // open tabs
});
