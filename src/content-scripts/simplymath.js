window.addEventListener('load', () => {
  const altTextPrefix = '$latex$';
  const writeImageToClipboard = async (url, latex) => {
    try {
      // How to copy image to clipboard
      // https://gist.github.com/dvreed77/c37759991b0723eebef3647015495253
      const image = new Image();
      image.src = url;
      image.alt = altTextPrefix + latex;
      document.body.appendChild(image);
      const r = document.createRange();
      r.setStartBefore(image);
      r.setEndAfter(image);
      r.selectNode(image);
      const selection = window.getSelection();
      selection.addRange(r);
      document.execCommand('copy');
      document.body.removeChild(image);
    } catch (err) {
      console.error(err.name, err.message);
    }
  }

  let currentEditableElement = null;
  let currentIframe = null;

  const pasteImageFromClipboard = () => {
    if (currentEditableElement === null) {
      return;
    }
    if (currentIframe !== null) {
      const win = currentIframe.contentWindow;
      const range = win.document.createRange();
      range.setStart(win.document.body, 0);
      range.setEnd(win.document.body, 0);
      win.document.body.focus();
      win.getSelection().addRange(range);
      win.document.execCommand('paste');
    } else {
      currentEditableElement.focus();
      document.execCommand('paste');
    }
  }

  const deleteImageAtCursor = () => {
    if (currentEditableElement === null) {
      return;
    }
    if (currentIframe !== null) {
      // Focus element where cursor is
      const win = currentIframe.contentWindow;
      const range = win.document.createRange();
      range.setStart(win.document.body, 0);
      range.setEnd(win.document.body, 0);
      win.document.body.focus();
      win.getSelection().addRange(range);

      // Simulate backspace keypress
      const event = new KeyboardEvent('keydown', {
       'key': 'Backspace',
       'code': 'Backspace',
       'keyCode': 8
      });
      event.isTrusted = true;
      win.document.dispatchEvent(event);
      console.log('dispatched backspace keydown event');
    } else {
      currentEditableElement.focus();
      const event = new KeyboardEvent('keydown', {
       'key': 'Backspace',
       'code': 'Backspace',
       'keyCode': 8
      });
      event.isTrusted = true;
      win.document.dispatchEvent(event);
      console.log('dispatched backspace keydown event');
    }
  }

  const clickHandler = (event) => {
    // check if main mouse button was clicked
    if (event.button !== 0) {
      return;
    }

    const clickedElement = event.target;

    const images = clickedElement.querySelectorAll('image');
    images.forEach((image) => {
      // check if click lands within image
      const domRect = image.getBoundingClientRect();
      if (event.userX < domRect.left) return;
      if (event.userX > domRect.right) return;
      if (event.userY < domRect.top) return;
      if (event.userY > domRect.bottom) return;

      // NOTE: this is google docs specific
      // alt text is in desc tag
      const desc = clickedElement.querySelector('desc');
      if (desc === undefined || desc === null) {
        return;
      }

      const altText = desc.textContent;
      if (!altText.startsWith(altTextPrefix)) {
        return;
      }

      const latex = altText.substr(altTextPrefix.length);
      console.log(latex);
      const editor = new SimplyMathEditor();
      editor.create(latex);
    });
  }

  window.addEventListener('focusin', () => {
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'IFRAME') {
      const editableElement = activeElement.contentWindow.document.querySelector('div[contenteditable="true"]');
      if (editableElement === undefined || editableElement === null) {
        return;
      }
      currentEditableElement = editableElement;
      currentIframe = activeElement;
    } else {
      currentEditableElement = activeElement;
      currentIframe = null;
    }
  });

  chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    switch (request.message) {
      case 'copyImage':
        await writeImageToClipboard(request.imageUrl, request.latex);
        sendResponse({ message: 'success' });
        break;
      case 'insertImage':
        await writeImageToClipboard(request.imageUrl, request.latex);
        pasteImageFromClipboard();
        sendResponse({ message: 'success' });
        break;
      default:
        sendResponse({ message: 'failure', description: `Unrecognized message type ${request.message}.` });
        break;
    }
  });

  window.addEventListener('click', (event) => {
    clickHandler(event);
  });
});
