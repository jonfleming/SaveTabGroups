const saveButton = document.getElementById("save-button")
const loadButton = document.getElementById("load-button")
const select = document.getElementById("save-name")
const message = document.getElementById("message")
let tabGroupsSaves = {}

const addOption = (name) => {
  const option = document.createElement("option")
  option.text = name
  option.vale = name
  select.add(option);
}

chrome.storage.sync.get(["tabGroupsSaves"], (result) => {
  if (result) {
    console.log(result)
    tabGroupsSaves = result.tabGroupsSaves
    Object.keys(tabGroupsSaves).forEach(save => {
      addOption(save)
    })
  }
})

saveButton.addEventListener('click', async () => {
  const groupList = []
  const name = document.getElementById("name").value

  if (!name) {
    message.innerText = 'Please enter a Name'
    return
  }
  // collapsed, color, id, title, windowId: 1
  message.innerText = ''
  chrome.tabGroups.query({ windowId: window.WINDOW_ID_CURRENT }, (tabGroups) => {
    tabGroups.forEach(group => {
      chrome.tabs.query({groupId: group.id}, (tabs) => {
        const tabList = []
        tabs.forEach(tab => {
          tabList.push({favIconUrl: tab.favIconUrl, title: tab.title, url: tab.url})
        })
        group.tabs = tabList
        groupList.push(group)
      })  
    })
    
    
    tabGroupsSaves[name] = groupList
    chrome.storage.sync.set({ tabGroupsSaves }, () => {
      addOption(name)
      message.innerText = `Tab Groups [${name}] Saved.`  
    });
  })
});
  
// https://github.com/parthpower/chrome-tab-group-exporter  
loadButton.addEventListener('click', async () => {
  // load tab groups
  const name = select.value
  const tabGroups = tabGroupsSaves[name]

  // close existing tabs

  // open tabs
  tabGroups.forEach(tabGroup => {  
    let tabIds = []
    tabGroup.tabs.forEach(tab => {
      // add tab
      const newTab = await chrome.tabs.create({
        url: tab.url,
        active: false,
      })
      if(tab.id !== chrome.tabs.TAB_ID_NONE) {
        tabIds.push(tab.id)
      }
    })

    const groupId = await chrome.tabs.group({
      tabIds: tabIds
    })

    chrome.tabGroups.update(groupId, {title: tabGroup.title, color: tabGroup.color})
  })
})

