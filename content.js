'use strict';
chrome.runtime.onMessage.addListener(onMessage);

function onMessage(message, sender, sendResponse) {
  if (message.action === 'extract') {
    sendResponse(extractLinks());
  } else {
    throw new Error('Unknown type of message');
  }
};

function extractLinks() {
  const links = [];

  for (let index = 0; index < document.links.length; index++) {
    links.push(decodeURI(document.links[index].href));
  }

  return links.length ? links : null;
};
