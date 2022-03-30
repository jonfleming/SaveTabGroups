const saveButton = document.getElementById("save-button")
const loadButton = document.getElementById("load-button")
const table = document.getElementById("table")
const message = document.getElementById("message")
const preview = document.getElementById("preview")
const previewHeading = document.getElementById("preview-heading")
// yellow is 'orange' in Edge
const order = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'teal', 'gray']

let tabGroupSaves = {}
let selected = ''

function sortOrder(a, b) {
  const ia = order.indexOf(a.color)
  const ib = order.indexOf(b.color)
  return ia - ib
}

function addRow(name) {
  const tr = table.insertRow(-1)
  const td = tr.insertCell(0)
  const icon = tr.insertCell(1)
  const text = document.createTextNode(name)
  td.classList.add('saved-cell')
  td.appendChild(text)
  icon.appendChild(document.createTextNode('Delete'))
  icon.classList.add('close')
  icon.style.width = '1rem'
  icon.addEventListener('click', deleteRow)
}

function deleteRow(event) {
  const node = event.target
  const tr = node.parentNode
  const name = node.previousSibling.innerHTML

  if (confirm(`Delete saved groups [${name}]`)) {
    table.deleteRow(tr.rowIndex)
    delete tabGroupSaves[name]
    chrome.storage.local.set({ tabGroupSaves })
    selected = '' 
    message.innerText = `Deleted saved groups [${name}]`
    message.style.color = 'gray'
  }
}

function clearSelections() {
  const cells = document.querySelectorAll('td')
  cells.forEach(cell => { cell.classList.remove('selected')})
}

function showPreview(name) {  
  const tabGroups = tabGroupSaves[name]
  previewHeading.classList.remove('hide')
  let list = ''
  for (let i = 0; i < tabGroups?.length; i++) {
    list += `<li>&#9654; ${tabGroups[i].title}</li>`
  }

  preview.innerHTML = `<ul>${list}</ul>`
}

table.addEventListener('click', (event) => {
  const td = event.target
  const tr = td.parentNode
  selected = td.innerHTML
  clearSelections()
  td.classList.add('selected')
  showPreview(selected)
})

chrome.storage.local.get(["tabGroupSaves"], (result) => {
  if (result) {
    console.log('storage:', result)
    
    if (result.tabGroupSaves) {
      tabGroupSaves = result.tabGroupSaves

      Object.keys(tabGroupSaves).forEach(save => {
        addRow(save)      
      })  
    }
  }
})

saveButton.addEventListener('click', async () => {
  const groupList = []
  const name = document.getElementById("name").value

  if (!name) {
    message.innerText = 'Please enter a Name'
    message.style.color = 'red'
    return
  }
  
  message.innerText = ''
  const tabGroups = await chrome.tabGroups.query({})
  tabGroups.sort(sortOrder)
  const tabs = await chrome.tabs.query({ })
  for (let i = 0; i < tabGroups.length; i++) {
    const group = tabGroups[i]
    const tabList = []
    for (let j = 0; j < tabs.length; j++) {          
      const tab = tabs[j]
      if (tab.groupId === group.id) {
        tabList.push({ favIconUrl: tab.favIconUrl, title: tab.title, url: tab.url })
      }
    }
    group.tabs = tabList
    groupList.push(group)
  }
    
  tabGroupSaves[name] = groupList
  chrome.storage.local.set({ tabGroupSaves }, () => {
    addRow(name)
    message.innerText = `Tab Groups [${name}] Saved.`
    message.style.color = 'green'
  });
});
  
loadButton.addEventListener('click', async () => {
  if (!selected || selected === 'Delete') {
    message.innerText = 'Please select a saved Tab Groups'
    message.style.color = 'red'
    return
  }

  const tabGroups = tabGroupSaves[selected]
  tabGroups.sort(sortOrder)

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
    
    message.innerText = `Loaded Tab Groups ${selected}]`
    message.style.color = 'green'
  }
})

