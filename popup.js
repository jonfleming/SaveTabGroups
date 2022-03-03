const saveButton = document.getElementById("save-button")
const loadButton = document.getElementById("load-button")
const table = document.getElementById("table")
const message = document.getElementById("message")

let tabGroupsSaves = {}
let selected = ''

const addRow = (name) => {
  const tr = table.insertRow(-1)
  const td = tr.insertCell(0)
  const icon = tr.insertCell(1)
  const text = document.createTextNode(name)
  td.appendChild(text)
  icon.appendChild(document.createTextNode('X'))
  icon.classList.add('close')
  icon.addEventListener('click', deleteRow)
}

const deleteRow = (event) => { 
  const node = event.target
  const tr = node.parentNode
  const name = node.previousSibling.innerHTML
  table.deleteRow(tr.rowIndex)
  delete tabGroupsSaves[name]
  chrome.storage.sync.set({ tabGroupsSaves })
  selected = ''
}

const clearSelections = () => {
  const cells = document.querySelectorAll('td')
  cells.forEach(cell => { cell.classList.remove('selected')})
}

table.addEventListener('click', (event) => {
  const td = event.target
  selected = td.innerHTML
  clearSelections()
  td.classList.add('selected')
})

chrome.storage.sync.get(["tabGroupsSaves"], (result) => {
  if (result) {
    console.log(result)
    tabGroupsSaves = result.tabGroupsSaves
    Object.keys(tabGroupsSaves).forEach(save => {
      addRow(save)
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
      addRow(name)
      message.innerText = `Tab Groups [${name}] Saved.`  
    });
  })
});
  
loadButton.addEventListener('click', async () => {
  if (!selected || selected === 'X') {
    message.innerText = 'Please select saved Tab Groups'
    return
  }

  const tabGroups = tabGroupsSaves[selected]

  for (let i = 0; i < tabGroups.length; i++) {
    const tabGroup = tabGroups[i]
    let tabIds = []

    for (let j = 0; j < tabGroup.tabs.length; j++) {
      const tab = tabGroup.tabs[j]
      const newTab = await chrome.tabs.create({
        url: tab.url,
        active: false,
      })

      if(newTab.id !== chrome.tabs.TAB_ID_NONE) {
        tabIds.push(newTab.id)
      }
    }

    const groupId = await chrome.tabs.group({tabIds})
    chrome.tabGroups.update(groupId, { title: tabGroup.title, color: tabGroup.color })
    
    message.innerText = 'Loaded Tab Groups [${selected}]'
  }
})

