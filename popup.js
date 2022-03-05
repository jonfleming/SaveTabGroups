const saveButton = document.getElementById("save-button")
const loadButton = document.getElementById("load-button")
const table = document.getElementById("table")
const message = document.getElementById("message")
const preview = document.getElementById("preview")

let tabGroupsSaves = {}
let selected = ''

function addRow(name) {
  const tr = table.insertRow(-1)
  const td = tr.insertCell(0)
  const icon = tr.insertCell(1)
  const text = document.createTextNode(name)
  td.appendChild(text)
  icon.appendChild(document.createTextNode('X'))
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
    delete tabGroupsSaves[name]
    chrome.storage.sync.set({ tabGroupsSaves })
    selected = '' 
    message.innerText = `Deleted saved groups [${name}]`
    message.style.color = 'gray'
  }
}

function clearSelections() {
  const cells = document.querySelectorAll('tr')
  cells.forEach(cell => { cell.classList.remove('selected')})
}

function showPreview(name) {
  const tabGroups = tabGroupsSaves[name]
  let list = ''
  for (let i = 0; i < tabGroups?.length; i++) {
    list += `<li>${tabGroups[i].title}</li>`
  }

  preview.innerHTML = `<ul>${list}</ul>`
}

table.addEventListener('click', (event) => {
  const td = event.target
  const tr = td.parentNode
  selected = td.innerHTML
  clearSelections()
  tr.classList.add('selected')
  showPreview(selected)
})

chrome.storage.sync.get(["tabGroupsSaves"], (result) => {
  if (result) {
    console.log('storage:', result)
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
    message.style.color = 'red'
    return
  }
  
  message.innerText = ''
  const tabGroups = await chrome.tabGroups.query({  })
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
    
  tabGroupsSaves[name] = groupList
  chrome.storage.sync.set({ tabGroupsSaves }, () => {
    addRow(name)
    message.innerText = `Tab Groups [${name}] Saved.`
    message.style.color = 'green'
  });
});
  
loadButton.addEventListener('click', async () => {
  if (!selected || selected === 'X') {
    message.innerText = 'Please select saved Tab Groups'
    message.style.color = 'red'
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
    
    message.innerText = `Loaded Tab Groups ${selected}]`
    message.style.color = 'green'
  }
})

