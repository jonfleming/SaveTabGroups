// &#9654; = ▶
//
const title = document.getElementById("title");
const saveButton = document.getElementById("save-button");
const saveLink = document.getElementById("save-link");
const input = document.getElementById("input");
const loadButton = document.getElementById("load-button");
const table = document.getElementById("saved-groups-table");
const message = document.getElementById("message");
const preview = document.getElementById("preview");
const previewHeading = document.getElementById("preview-heading");
const groupName = document.getElementById("group-name");
const noSaves = document.getElementById("no-saves");
// yellow is 'orange' in Edge. teal is cyan, gray is grey
const order = [
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "grey",
];
let currentCell = table.rows[0]?.cells[0];
let tabGroupSaves = {};
let selected = "";

function sortOrder(a, b) {
  const ia = order.indexOf(a.color);
  const ib = order.indexOf(b.color);
  return ia - ib;
}

function addRow(name) {
  const tr = table.insertRow(-1);
  const td = tr.insertCell(0);
  const text = document.createTextNode(name);
  td.classList.add("saved-cell");
  td.appendChild(text);
  noSaves.classList.add("hide");
}

function deleteRow() {
  const tr = currentCell.parentNode;
  const name = currentCell.innerHTML;

  if (confirm(`Delete saved groups [${name}]`)) {
    table.deleteRow(tr.rowIndex);
    delete tabGroupSaves[name];
    setTabGroupSaves(() => {});
    selected = "";
    message.innerText = `Deleted saved groups [${name}]`;
    message.style.color = "gray";
    clearSelection();
  }
}

function clearSelection() {
  currentCell.classList.remove("selected");
  currentCell = undefined;
  document.removeEventListener("onkeydown", checkKey);
  previewHeading.classList.add("hide");
  loadButton.classList.add("hide");
}

function showPreview(name) {
  const tabGroups = tabGroupSaves[name];
  previewHeading.classList.remove("hide");
  let list = "";
  for (let i = 0; i < tabGroups?.length; i++) {
    list += `<li><span class="rotate">◢</span> ${tabGroups[i].title}</li>`;
  }

  preview.innerHTML = `<ul>${list}</ul>`;
}

input.addEventListener("keyup", (event) => {
  if (event.key === "Enter") {
    saveButton.click();
  }
});
table.addEventListener("click", (event) => {
  const td = event.target;
  selectCell(td);
});

saveLink.addEventListener("click", (event) => {
  input.classList.remove("hide");
  groupName.focus();
});

async function saveClick() {
  const groupList = [];
  const name = groupName.value;
  const currentWindow = await chrome.windows.getCurrent();

  if (!name) {
    message.innerText = "Please enter a name";
    message.style.color = "red";
    return null;
  }

  message.innerText = "";
  const tabGroups = await chrome.tabGroups.query({ windowId: currentWindow.id });
  tabGroups.sort(sortOrder);
  const tabs = await chrome.tabs.query({});
  for (const element of tabGroups) {
    const group = element;
    const tabList = [];
    for (const tab of tabs) {
      if (tab.groupId === group.id) {
        tabList.push({
          favIconUrl: tab.favIconUrl,
          title: tab.title,
          url: tab.url,
        });
      }
    }
    group.tabs = tabList;
    groupList.push(group);
  }

  tabGroupSaves[name] = groupList;

  // clear and rebuild Saved Groups ist
  table.innerHTML = "<tr><th>Saved Groups</th></tr>";
  setTabGroupSaves((item) => {
    addRow(item);
    message.innerHTML = `<br/><br/>Tab Groups [${name}] Saved.`;
    message.style.color = "green";
  });
}

async function loadClick() {
  if (!selected || selected === "Delete") {
    message.innerText = "Please select a saved Tab Groups";
    message.style.color = "red";
    return;
  }

  const tabGroups = tabGroupSaves[selected];
  tabGroups.sort(sortOrder);

  for (const element of tabGroups) {
    const tabGroup = element;
    let tabIds = [];

    for (const element of tabGroup.tabs) {
      const tab = element;
      const newTab = await chrome.tabs.create({
        url: tab.url,
        active: false,
      });

      if (newTab.id !== chrome.tabs.TAB_ID_NONE) {
        tabIds.push(newTab.id);
      }
    }

    const groupId = await chrome.tabs.group({ tabIds });
    chrome.tabGroups.update(groupId, {
      title: tabGroup.title,
      color: tabGroup.color,
      collapsed: tabGroup.collapsed,
    });

    message.innerText = `Loaded Tab Groups ${selected}]`;
    message.style.color = "green";
  }
}

saveButton.addEventListener("click", async () => {
  await saveClick().catch(error => console.log(error));
  input.classList.add("hide");
});

loadButton.addEventListener("click", () => {
  loadClick().catch(error => console.log(error));
});

// Table Navigation
function selectCell(td) {
  if (td?.tagName === "TD") {
    td.focus();
    currentCell?.classList.remove("selected");
    selected = td.innerHTML;
    currentCell = td;
    td.classList.add("selected");
    loadButton.classList.remove("hide");
    showPreview(selected);
    document.onkeydown = checkKey;
  } else {
    loadButton.classList.add("hide");
    previewHeading.classList.add("hide");
    preview.innerHTML = "";
  }
}

function checkKey(e) {
  let idx, nextrow, sibling;
  if (e.keyCode == "38") {
    // up arrow
    idx = currentCell.cellIndex;
    nextrow = currentCell.parentElement.previousElementSibling;
    if (nextrow != null) {
      sibling = nextrow.cells[idx];
      selectCell(sibling);
    }
  } else if (e.keyCode == "40") {
    // down arrow
    idx = currentCell.cellIndex;
    nextrow = currentCell.parentElement.nextElementSibling;
    if (nextrow != null) {
      sibling = nextrow.cells[idx];
      selectCell(sibling);
    }
  } else if (e.keyCode == "37") {
    // left arrow
    sibling = currentCell.previousElementSibling;
    selectCell(sibling);
  } else if (e.keyCode == "39") {
    // right arrow
    sibling = currentCell.nextElementSibling;
    selectCell(sibling);
  } else if (e.keyCode == "46") {
    // delete
    deleteRow();
  }
}

function getTabGroupSaves(action) {
  tabGroupSaves = {};

  chrome.storage.local.get(["saves"]).then((response) => {
    if (response) {
      console.log("storage:", response);
      const groups = response.saves;
      for (let save of groups) {
        chrome.storage.local.get([save], (tabs) => {
          console.log("storage:", tabs);
          tabGroupSaves[save] = tabs[save];
          action(save);
        });
      }
    }
  });
}

function setTabGroupSaves(action) {
  const saves = Object.keys(tabGroupSaves);

  chrome.storage.local.set({ saves }).then(() => {
    for (let save of saves) {
      const storageItem = {};
      storageItem[save] = tabGroupSaves[save];
      chrome.storage.local.set(storageItem).then(() => {
        console.log("saved ", save);
        action(save);
      });
    }
  });
}

title.addEventListener("click", () => {
  // debugging
  // getTabGroupSaves((name) => addRow(name))
});

getTabGroupSaves((name) => addRow(name));
