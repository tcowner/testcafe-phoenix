HammerheadClient.define('DOMSandbox.NativeMethods', function (require, exports) {
    function refreshDocumentMeths(doc) {
        doc = doc || document;

        /* jshint ignore:start */
        // Dom
        exports.createDocumentFragment = doc.createDocumentFragment || Document.prototype.createDocumentFragment;
        exports.createElement = doc.createElement || Document.prototype.createElement;
        exports.createElementNS = doc.createElementNS || Document.prototype.createElementNS;
        exports.documentOpen = doc.open || Document.prototype.open;
        exports.documentClose = doc.close || Document.prototype.close;
        exports.documentWrite = doc.write || Document.prototype.write;
        exports.documentWriteLn = doc.writeln || Document.prototype.writeln;
        exports.elementFromPoint = doc.elementFromPoint || Document.prototype.elementFromPoint;
        exports.getElementById = doc.getElementById || Document.prototype.getElementById;
        exports.getElementsByClassName = doc.getElementsByClassName || Document.prototype.getElementsByClassName;
        exports.getElementsByName = doc.getElementsByName || Document.prototype.getElementsByName;

        exports.getElementsByTagName = doc.getElementsByTagName || Document.prototype.getElementsByTagName;
        exports.querySelector = doc.querySelector || Document.prototype.querySelector;
        exports.querySelectorAll = doc.querySelectorAll || Document.prototype.querySelectorAll;

        // Event
        exports.documentAddEventListener = doc.addEventListener || Document.prototype.addEventListener;
        exports.documentRemoveEventListener = doc.removeEventListener || Document.prototype.removeEventListener;
        /* jshint ignore:end */
    }

    function refreshElementMeths(doc) {
        var createElement = function (tagName) {
                return exports.createElement.call(doc || document, tagName);
            },
            nativeElement = createElement('div');

        // Dom
        exports.appendChild = nativeElement.appendChild;
        exports.cloneNode = nativeElement.cloneNode;
        exports.elementGetElementsByClassName = nativeElement.getElementsByClassName;
        exports.elementGetElementsByTagName = nativeElement.getElementsByTagName;
        exports.elementQuerySelector = nativeElement.querySelector;
        exports.elementQuerySelectorAll = nativeElement.querySelectorAll;
        exports.getAttribute = nativeElement.getAttribute;
        exports.getAttributeNS = nativeElement.getAttributeNS;
        exports.insertAdjacentHTML = nativeElement.insertAdjacentHTML;
        exports.insertBefore = nativeElement.insertBefore;
        exports.insertCell = createElement('tr').insertCell;
        exports.insertTableRow = createElement('table').insertRow;
        exports.insertTBodyRow = createElement('tbody').insertRow;
        exports.removeAttribute = nativeElement.removeAttribute;
        exports.removeAttributeNS = nativeElement.removeAttributeNS;
        exports.removeChild = nativeElement.removeChild;
        exports.setAttribute = nativeElement.setAttribute;
        exports.setAttributeNS = nativeElement.setAttributeNS;

        // Event
        exports.addEventListener = nativeElement.addEventListener;
        exports.attachEvent = nativeElement.attachEvent;
        exports.detachEvent = nativeElement.detachEvent;
        exports.blur = nativeElement.blur;
        exports.click = nativeElement.click;
        exports.dispatchEvent = nativeElement.dispatchEvent;
        exports.fireEvent = nativeElement.fireEvent;
        exports.focus = nativeElement.focus;
        exports.removeEventListener = nativeElement.removeEventListener;
        exports.select = window.TextRange ? createElement('body').createTextRange().select : null;
        exports.setSelectionRange = createElement('input').setSelectionRange;
        exports.textAreaSetSelectionRange = createElement('textarea').setSelectionRange;
    }

    function refreshWindowMeths(win) {
        win = win || window;
        /* jshint ignore:start */
        // Dom
        exports.eval = win.eval;
        exports.eventSourceCtor = win.EventSource;
        exports.formSubmit = win.HTMLFormElement.prototype.submit;
        exports.historyPushState = win.history ? win.history.pushState : null;
        exports.historyReplaceState = win.history ? win.history.replaceState : null;
        exports.imageCtor = win.Image;
        exports.mutationObserverCtor = win.MutationObserver;
        exports.postMessage = win.postMessage || Window.prototype.postMessage;
        exports.windowOpen = win.open || Window.prototype.open;
        exports.workerCtor = win.Worker;
        exports.setTimeout = win.setTimeout || Window.prototype.setTimeout;
        exports.setInterval = win.setInterval || Window.prototype.setInterval;
        exports.XMLHttpRequest = win.XMLHttpRequest;
        exports.registerProtocolHandler = win.navigator.registerProtocolHandler;
        exports.registerServiceWorker = (win.navigator && win.navigator.serviceWorker) ? win.navigator.serviceWorker.register : null; 

        // Event
        exports.windowAddEventListener = win.addEventListener || Window.prototype.addEventListener;
        exports.windowRemoveEventListener = win.removeEventListener || Window.prototype.removeEventListener;

        // Canvas
        exports.canvasContextDrawImage = win.CanvasRenderingContext2D.prototype.drawImage;
        /* jshint ignore:end */
    }

    exports.refreshDocument = refreshDocumentMeths;
    exports.refreshElementMeths = refreshElementMeths;
    exports.refreshWindowMeths = refreshWindowMeths;

    refreshDocumentMeths();
    refreshElementMeths();
    refreshWindowMeths();

    exports.restoreNativeDocumentMeth = function (document) {
        document.createDocumentFragment = exports.createDocumentFragment;
        document.createElement = exports.createElement;
        document.createElementNS = exports.createElementNS;
        document.open = exports.documentOpen;
        document.close = exports.documentClose;
        document.write = exports.documentWrite;
        document.writeln = exports.documentWriteLn;
        document.elementFromPoint = exports.elementFromPoint;
        document.getElementById = exports.getElementById;
        document.getElementsByClassName = exports.getElementsByClassName;
        document.getElementsByName = exports.getElementsByName;
        document.getElementsByTagName = exports.getElementsByTagName;
        document.querySelector = exports.querySelector;
        document.querySelectorAll = exports.querySelectorAll;

        // Event
        document.addEventListener = exports.documentAddEventListener;
        document.removeEventListener = exports.documentRemoveEventListener;
    };
});