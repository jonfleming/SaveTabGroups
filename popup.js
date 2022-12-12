const saveButton = document.getElementById('save-button')
const saveLink = document.getElementById('saveLink')
const input = document.getElementById('input')
const loadButton = document.getElementById('load-button')
const table = document.getElementById('table')
const message = document.getElementById('message')
const preview = document.getElementById('preview')
const previewHeading = document.getElementById('preview-heading')
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
}

function deleteRow() {
  const tr = currentCell.parentNode
  const name = currentCell.innerHTML

  if (confirm(`Delete saved groups [${name}]`)) {
    table.deleteRow(tr.rowIndex)
    delete tabGroupSaves[name]
    chrome.storage.local.set({ tabGroupSaves })
    selected = '' 
    message.innerText = `Deleted saved groups [${name}]`
		message.style.color = 'gray'
		clearSelection()
  }
}

function clearSelection() {
	currentCell.classList.remove('selected')
	currentCell = undefined
	document.removeEventListener('onkeydown', checkKey)
	previewHeading.classList.add('hide')
	loadButton.classList.add('hide')
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
	selectCell(td)
})

saveLink.addEventListener('click', (event) => {
	input.classList.remove('hide')
})

chrome.storage.local.get(['tabGroupSaves'], (result) => {
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
  const name = document.getElementById('name').value

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
    message.innerHTML = `<br\><br\>Tab Groups [${name}] Saved.`
    message.style.color = 'green'
	});
	
	input.classList.add('hide')
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

// Table Navigation
function selectCell(td) {
	if (td != null) {
		td.focus()
		currentCell?.classList.remove('selected')
		selected = td.innerHTML
		currentCell = td;
		td.classList.add('selected')
		loadButton.classList.remove('hide')
		showPreview(selected)
		document.onkeydown = checkKey
  }
}

function checkKey(e) {
  e = e || window.event;
	if (e.keyCode == '38') {
		// up arrow
		var idx = currentCell.cellIndex;
		var nextrow = currentCell.parentElement.previousElementSibling;
		if (nextrow != null) {
			var sibling = nextrow.cells[idx];
			selectCell(sibling);
		}
	} else if (e.keyCode == '40') {
		// down arrow
		var idx = currentCell.cellIndex;
		var nextrow = currentCell.parentElement.nextElementSibling;
		if (nextrow != null) {
			var sibling = nextrow.cells[idx];
			selectCell(sibling);
		}
	} else if (e.keyCode == '37') {
		// left arrow
		var sibling = currentCell.previousElementSibling;
		selectCell(sibling);
	} else if (e.keyCode == '39') {
		// right arrow
		var sibling = currentCell.nextElementSibling;
		selectCell(sibling);
	} else if (e.keyCode == '46') {
		// delete
		deleteRow(currentCell)
	}
}

var currentCell = table.rows[0]?.cells[0]
