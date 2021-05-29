const YT_VDEO_REGEX = new RegExp(
  "^(https?://)?(www.)?(youtube.com|youtu.?be)/.+$"
);
document.getElementById("extract-all").addEventListener("click", (event) => {
  handler().then(console.log);
});

// let localStorgeData;
// chrome.storage.local.get(function (result) {
//   localStorgeData = result;
// });

const videoid = "n6q9TTZD3mA";
const time = 426;

let NOTION_URL = "";

const searchElement = document.getElementById("search-box");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const listElement = document.getElementById("list");

searchElement.style.visibility = "hidden";

searchButton.addEventListener("click", (e) => {
  const searchQuery = searchInput.value;
  if (searchQuery && NOTION_URL) {
    fetch(`https://elayted-node.herokuapp.com/q/?q=${searchQuery}&notion=${NOTION_URL}`)
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        if (data) {
          const { message } = data;
          listElement.innerHTML = "";
          message.forEach((message) => {
            const { yt_id, start, text } = message || {
              yt_id: { raw: "" },
              start: { raw: "" },
              text: { raw: "" },
            };

            if (yt_id.raw && start.raw) {
              appendSearchResult(yt_id.raw, Math.floor(start.raw), text.raw);
            }
          });
        }
      })
      .catch(console.log);
  }
});

function appendSearchResult(videoId, startTime, startText) {
  let title = startText + "...";
  const searchResultText = startText + "...";

  chrome.storage.local.get([`${videoId}`], function (result) {
    console.log(result);
    if (result[videoId]) {
      title = result[videoId];
    }
    listElement.append(
      createElementFromHTML(`<li>
    <a class="list-item" target="_blank" href="${`https://youtu.be/${videoId}?t=${startTime}`}"> 
    <div class="list-item-image-container">
      <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" class="list-item-image">
    </div>
    <div class="list-item-content">
      <h4>${title}</h4>
      <h3> ${searchResultText}</h3>
      <p>${new Date(startTime * 1000).toISOString().substr(11, 8)}</p>
    </div>
    </a>
    </li>`)
    );
  });
}

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
        // console.log(youtubeVideoIds);

        //current tab Url
        NOTION_URL = tabUrl;
        if (youtubeVideoIds) {
          searchElement.style.visibility = "visible";

          //send POST request to backend with notion url and yt video ids
          indexYoutubeTranscripts(youtubeVideoIds, tabUrl);
        }
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

// API calls
function indexYoutubeTranscripts(youtubeIds, notionUrl) {
  const allVideoIds = youtubeIds;
  let newVideoIds = [];

  allVideoIds.forEach((videoId) => {
    let data = null;
    chrome.storage.local.get([`${videoId}`], function (result) {
      data = result;
      console.log(data);
      if (data && Object.keys(data).length === 0) {
        console.log("empty obj", videoId);
        newVideoIds.push(videoId);
        fetch(
          `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
        )
          .then((response) => response.json())
          .then((data) => {
            chrome.storage.local.set(
              { [`${videoId}`]: data.title },
              function () {
                console.log("Title of video is " + data.title);
              }
            );
          })
          .catch(console.log);
      }
    });
  });

  setTimeout(() => {
    console.log({ yt_ids: newVideoIds, notion: notionUrl });
    if (newVideoIds.length) {
      fetch(`https://elayted-node.herokuapp.com/index`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ yt_ids: newVideoIds, notion: notionUrl }),
      })
        .then(console.log)
        .catch(console.log);
    }
  }, 10);
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
