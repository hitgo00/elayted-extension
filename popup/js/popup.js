const YT_VDEO_REGEX = new RegExp(
  "^(https?://)?(www.)?(youtube.com|youtu.?be)/.+$"
);
document.getElementById("extract-all").addEventListener("click", (event) => {
  handler().then(console.log);
});

//localstorage : store title; if video id is present don't send with req.

const videoid = "n6q9TTZD3mA";
const time = 426;

const searchElement = document.getElementById("search-box");
const listElement = document.getElementById("list");
listElement.append(
  createElementFromHTML(`<li>
<a class="list-item" target="_blank" href="${`https://youtu.be/${videoid}?t=${time}`}"> 
<div class="list-item-image-container">
  <img src="https://img.youtube.com/vi/${videoid}/mqdefault.jpg" class="list-item-image">
</div>
<div class="list-item-content">
  <h4>Debugging Production Issues: Front-End Engineer vs Back-End Engineer</h4>
  <p>7:06</p>
</div>
</a>
</li>`)
);
searchElement.style.visibility = "hidden";

function handler() {
  let tabId;
  let tabUrl;

  return getCurrentTab()
    .then((items) => {
      tabId = items[0].id;
      tabUrl = items[0].url;
      return injectScript(tabId);
    })
    .then(() => {
      chrome.tabs.sendMessage(tabId, { action: "extract" }, (links) => {
        //get only youtube video links
        const youtubeVideoLinks = links.filter((link) =>
          link.match(YT_VDEO_REGEX)
        );
        //get only youtube video ids
        const youtubeVideoIds = getVideoIds(youtubeVideoLinks);
        console.log(youtubeVideoIds);

        //current tab Url
        console.log(tabUrl);
        if (youtubeVideoIds) {
          searchElement.style.visibility = "visible";
        }

        //send POST request to backend with notion url and yt video ids
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






//utils

function createElementFromHTML(htmlString) {
  var div = document.createElement("div");
  div.innerHTML = htmlString.trim();

  // Change this to div.childNodes to support multiple top-level nodes
  return div.firstChild;
}



function getVideoIds(videoLinks) {
  let videoIds = [];

  videoLinks.forEach((link) => {
    const videoid = link.match(
      /(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/
    );
    if (videoid != null) {
      videoIds.push(videoid[1]);
    }
  });
  return videoIds.length ? videoIds : null;
}