const YT_VDEO_REGEX = new RegExp(
  "^(https?://)?(www.)?(youtube.com|youtu.?be)/.+$"
);
document.getElementById("extract-all").addEventListener("click", (event) => {
  handler().then(console.log);
});

function handler() {
  var tabId;

  return getCurrentTab()
    .then((items) => {
      tabId = items[0].id;
      return injectScript(tabId);
    })
    .then(() => {
      chrome.tabs.sendMessage(tabId, { action: "extract" }, (links) => {
        //get only youtube video links
        console.log(links.filter((link)=> link.match(YT_VDEO_REGEX)));
      });
    })
    .catch((error) => window.alert(error));
}

function getCurrentTab() {
  return new Promise((res, rej) => {
    const queryInfo = {
      active: true,
      currentWindow: true,
    };

    chrome.tabs.query(queryInfo, (items) => passNext(items, res, rej));
  });
}

function injectScript(tabId, file = "/content.js") {
  return new Promise((res, rej) => {
    const details = {
      file,
      runAt: "document_start",
    };

    chrome.tabs.executeScript(tabId, details, (item) =>
      passNext(item, res, rej)
    );
  });
}

function passNext(result, fulfill, reject) {
  if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
  return fulfill(result);
}
