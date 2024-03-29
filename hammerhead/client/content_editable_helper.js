HammerheadClient.define('ContentEditableHelper', function (require, exports) {
    var $ = require('jQuery'),
        Util = require('Util');

    //nodes utils
    function getOwnFirstVisibleTextNode(el) {
        var childrenArray = $.makeArray(el.childNodes),
            child = null;

        if (!childrenArray.length && el.nodeType === 3 && !exports.isInvisibleTextNode(el))
            return el;

        $.each(childrenArray, function (index, value) {
            if (value.nodeType === 3 && !exports.isInvisibleTextNode(value)) {
                child = value;
                return false;
            }
        });
        return child;
    }

    function getOwnFirstVisibleNode(el) {
        var childrenArray = $.makeArray(el.childNodes),
            child = null;

        $.each(childrenArray, function (index, value) {
            if (value.nodeType === 3) {
                if (!exports.isInvisibleTextNode(value)) {
                    child = value;
                    return false;
                }
            }
            else if (Util.isRenderedNode(value) && getOwnFirstVisibleNode(value)) {
                child = value;
                return false;
            }
        });
        return child;
    }

    function getOwnPreviousVisibleSibling(el) {
        var sibling = null,
            current = el;

        while (!sibling) {
            current = current.previousSibling;
            if (!current)
                break;
            else if (Util.isRenderedNode(current) && !exports.isInvisibleTextNode(current)) {
                sibling = current;
                break;
            }
        }
        return sibling;
    }

    //NOTE: before such elements (like div or p) adds line breaks before and after it
    // (except line break before first visible element in contentEditable parent)
    // this line breaks is not contained in node values
    //so we should take it into account manually
    function isNodeBlockWithBreakLine(parent, node) {
        var parentFirstVisibleChild = null,
            firstVisibleChild = null;

        if (!Util.isTheSameNode(node, parent) && node.childNodes.length && /div|p/.test(node.tagName.toLowerCase())) {
            parentFirstVisibleChild = getOwnFirstVisibleNode(parent);

            if (!parentFirstVisibleChild || Util.isTheSameNode(node, parentFirstVisibleChild))
                return false;

            firstVisibleChild = exports.getFirstVisibleTextNode(parentFirstVisibleChild);
            if (!firstVisibleChild || Util.isTheSameNode(node, firstVisibleChild))
                return false;

            return getOwnFirstVisibleTextNode(node);
        }
        return false;
    }

    function isNodeAfterNodeBlockWithBreakLine(parent, node) {
        var isRenderedNode = Util.isRenderedNode(node),
            parentFirstVisibleChild = null,
            firstVisibleChild = null,
            previousSibling = null;

        if (!Util.isTheSameNode(node, parent) &&
            ((isRenderedNode && node.nodeType === 1 && node.childNodes.length && !/div|p/.test(node.tagName.toLowerCase())) ||
             (node.nodeType === 3 && !Util.isTheSameNode(node, parent) && node.nodeValue.length && !exports.isInvisibleTextNode(node)))) {

            if (isRenderedNode && node.nodeType === 1) {
                parentFirstVisibleChild = getOwnFirstVisibleNode(parent);

                if (!parentFirstVisibleChild || Util.isTheSameNode(node, parentFirstVisibleChild))
                    return false;

                firstVisibleChild = exports.getFirstVisibleTextNode(parentFirstVisibleChild);
                if (!firstVisibleChild || Util.isTheSameNode(node, firstVisibleChild))
                    return false;
            }

            previousSibling = getOwnPreviousVisibleSibling(node);

            return (previousSibling && previousSibling.nodeType === 1 &&
                    /div|p/.test(previousSibling.tagName.toLowerCase()) && getOwnFirstVisibleTextNode(previousSibling));
        }
        return false;
    }

    exports.getFirstVisibleTextNode = function (el) {
        var childrenArray = $.makeArray(el.childNodes),
            element = null;

        if (!childrenArray.length && el.nodeType === 3 && !exports.isInvisibleTextNode(el))
            return el;

        $.each(childrenArray, function (index, value) {
            if (value.nodeType === 3 && !exports.isInvisibleTextNode(value)) {
                element = value;
                return false;
            }
            else if (Util.isRenderedNode(value) && (value.nodeType === 1 || (value.childNodes && value.childNodes.length))) {
                element = exports.getFirstVisibleTextNode(value);
                if (element)
                    return false;
            }
        });
        return element;
    };

    exports.getLastVisibleTextNode = function (el, onlyVisible) {
        var childrenArray = $.makeArray(el.childNodes),
            element = null;

        if (!childrenArray.length && el.nodeType === 3 && !exports.isInvisibleTextNode(el))
            return el;

        if (childrenArray.length)
            childrenArray = childrenArray.reverse();

        $.each(childrenArray, function (index, value) {
            if (value.nodeType === 3 && (onlyVisible ? !exports.isInvisibleTextNode(value) : true)) {
                element = value;
                return false;
            }
            else if (Util.isRenderedNode(value) && (value.nodeType === 1 || (value.childNodes && value.childNodes.length))) {
                element = exports.getLastVisibleTextNode(value, false);
                if (element)
                    return false;
            }
        });
        return element;
    };

    exports.getFirstNonWhitespaceSymbolIndex = function (nodeValue, startFrom) {
        if (!nodeValue || !nodeValue.length)
            return 0;

        var valueLength = nodeValue.length,
            index = startFrom || 0;

        for (var i = index; i < valueLength; i++) {
            if (nodeValue.charCodeAt(i) === 10 || nodeValue.charCodeAt(i) === 32)
                index++;
            else
                break;
        }
        return index;
    };

    exports.getLastNonWhitespaceSymbolIndex = function (nodeValue) {
        if (!nodeValue || !nodeValue.length)
            return 0;

        var valueLength = nodeValue.length,
            index = valueLength;

        for (var i = valueLength - 1; i >= 0; i--) {
            if (nodeValue.charCodeAt(i) === 10 || nodeValue.charCodeAt(i) === 32)
                index--;
            else
                break;
        }
        return index;
    };

    exports.isInvisibleTextNode = function (node) {
        if (node.nodeType !== 3)
            return false;

        var nodeValue = node.nodeValue,
            firstVisibleIndex = exports.getFirstNonWhitespaceSymbolIndex(nodeValue),
            lastVisibleIndex = exports.getLastNonWhitespaceSymbolIndex(nodeValue);

        return firstVisibleIndex === nodeValue.length && lastVisibleIndex === 0;
    };

    //dom utils
    exports.findContentEditableParent = function (el) {
        var $elParents = $(el).parents(),
            currentDocument = null,
            parent = null;

        function hasContentEditableAttr(el) {
            return typeof $(el).attr('contenteditable') !== 'undefined' && $(el).attr('contenteditable') !== 'false' && $(el).attr('contenteditable') !== 'inherit';
        }

        if (hasContentEditableAttr(el) && Util.isContentEditableElement(el))
            return el;

        currentDocument = Util.findDocument(el);
        if (currentDocument.designMode === 'on')
            return currentDocument.body;

        $.each($elParents, function (index, item) {
            if (hasContentEditableAttr(item) && Util.isContentEditableElement(item)) {
                parent = item;
                return false;
            }
        });
        return parent;
    };

    exports.getNearestCommonAncestor = function (node1, node2) {
        if (Util.isTheSameNode(node1, node2)) {
            if (Util.isTheSameNode(node2, exports.findContentEditableParent(node1)))
                return node1;
            return node1.parentNode;
        }

        var ancestors = [],
            contentEditableParent = exports.findContentEditableParent(node1),
            curNode = null;

        if (!Util.isElementContainsNode(contentEditableParent, node2))
            return null;

        for (curNode = node1; curNode !== contentEditableParent; curNode = curNode.parentNode)
            ancestors.push(curNode);

        for (curNode = node2; curNode !== contentEditableParent; curNode = curNode.parentNode) {
            if ($.inArray(curNode, ancestors) !== -1)
                return curNode;
        }

        return contentEditableParent;
    };

    //selection utils
    function getSelectedPositionInParentByOffset(node, offset) {
        var currentNode = null,
            currentOffset = null,
            isSearchForLastChild = offset >= node.childNodes.length;

        //NOTE: IE behavior
        if (isSearchForLastChild)
            currentNode = node.childNodes[node.childNodes.length - 1];
        else {
            currentNode = node.childNodes[offset];
            currentOffset = 0;
        }

        while (Util.isRenderedNode(currentNode) && currentNode.nodeType === 1) {
            if (currentNode.childNodes && currentNode.childNodes.length)
                currentNode = currentNode.childNodes[isSearchForLastChild ? currentNode.childNodes.length - 1 : 0];
            else {
                //NOTE: if we didn't find a text node then always set offset to zero
                currentOffset = 0;
                break;
            }
        }

        if (currentOffset !== 0 && Util.isRenderedNode(currentNode))
            currentOffset = currentNode.nodeValue ? currentNode.nodeValue.length : 0;

        return {
            node: currentNode,
            offset: currentOffset
        };
    }

    function getSelectionStart(el, selection, inverseSelection) {
        var startNode = inverseSelection ? selection.focusNode : selection.anchorNode,
            startOffset = inverseSelection ? selection.focusOffset : selection.anchorOffset,

            correctedStartPosition = {
                node: startNode,
                offset: startOffset
            };

        //NOTE: window.getSelection() can't returns not rendered node like selected node, so we shouldn't check it
        if ((Util.isTheSameNode(el, startNode) || startNode.nodeType === 1) && startNode.childNodes && startNode.childNodes.length)
            correctedStartPosition = getSelectedPositionInParentByOffset(startNode, startOffset);

        return {
            node: correctedStartPosition.node,
            offset: correctedStartPosition.offset
        };
    }

    function getSelectionEnd(el, selection, inverseSelection) {
        var endNode = inverseSelection ? selection.anchorNode : selection.focusNode,
            endOffset = inverseSelection ? selection.anchorOffset : selection.focusOffset,

            correctedEndPosition = {
                node: endNode,
                offset: endOffset
            };

        //NOTE: window.getSelection() can't returns not rendered node like selected node, so we shouldn't check it
        if ((Util.isTheSameNode(el, endNode) || endNode.nodeType === 1) && endNode.childNodes && endNode.childNodes.length)
            correctedEndPosition = getSelectedPositionInParentByOffset(endNode, endOffset);

        return {
            node: correctedEndPosition.node,
            offset: correctedEndPosition.offset
        };
    }

    exports.getSelection = function (el, selection, inverseSelection) {
        var correctedStart = getSelectionStart(el, selection, inverseSelection),
            correctedEnd = getSelectionEnd(el, selection, inverseSelection);

        return {
            startNode: correctedStart.node,
            startOffset: correctedStart.offset,
            endNode: correctedEnd.node,
            endOffset: correctedEnd.offset
        };
    };

    exports.getSelectionStartPosition = function (el, selection, inverseSelection) {
        var correctedSelectionStart = getSelectionStart(el, selection, inverseSelection);

        return exports.calculatePositionByNodeAndOffset(el, correctedSelectionStart.node, correctedSelectionStart.offset);
    };

    exports.getSelectionEndPosition = function (el, selection, inverseSelection) {
        var correctedSelectionEnd = getSelectionEnd(el, selection, inverseSelection);

        return exports.calculatePositionByNodeAndOffset(el, correctedSelectionEnd.node, correctedSelectionEnd.offset);
    };

    exports.calculateNodeAndOffsetByPosition = function (el, offset) {
        var point = {
            offset: offset,
            node: null
        };

        function checkChildNodes(target) {
            var childNodes = target.childNodes;

            if (point.node)
                return point;

            if (!Util.isRenderedNode(target))
                return point;

            if (target.nodeType === 3) {
                if (point.offset <= target.nodeValue.length) {
                    point.node = target;
                    return point;
                }
                else if (target.nodeValue.length) {
                    if (!point.node && isNodeAfterNodeBlockWithBreakLine(el, target))
                        point.offset--;

                    point.offset -= target.nodeValue.length;
                }
            }
            else if (target.nodeType === 1) {
                if (point.offset === 0 && !exports.getContentEditableValue(target).length) {
                    point.node = target;
                    return point;
                }
                if (!point.node && (isNodeBlockWithBreakLine(el, target) || isNodeAfterNodeBlockWithBreakLine(el, target)))
                    point.offset--;
                else if (!childNodes.length && target.nodeType === 1 && target.tagName.toLowerCase() === 'br')
                    point.offset--;
            }

            $.each(childNodes, function (index, value) {
                point = checkChildNodes(value);
            });

            return point;
        }

        return checkChildNodes(el);
    };

    exports.calculatePositionByNodeAndOffset = function (el, node, offset) {
        var currentOffset = 0,
            find = false;

        function checkChildNodes(target) {
            var childNodes = target.childNodes;

            if (find)
                return currentOffset;

            if (Util.isTheSameNode(node, target)) {
                if (isNodeBlockWithBreakLine(el, target) || isNodeAfterNodeBlockWithBreakLine(el, target))
                    currentOffset++;

                find = true;
                return currentOffset + offset;
            }

            if (!Util.isRenderedNode(target))
                return currentOffset;

            if (!childNodes.length && target.nodeValue && target.nodeValue.length) {
                if (!find && isNodeAfterNodeBlockWithBreakLine(el, target))
                    currentOffset++;

                currentOffset += target.nodeValue.length;
            }

            else if (!childNodes.length && target.nodeType === 1 && target.tagName.toLowerCase() === 'br')
                currentOffset++;

            else if (!find && (isNodeBlockWithBreakLine(el, target) || isNodeAfterNodeBlockWithBreakLine(el, target)))
                currentOffset++;

            $.each(childNodes, function (index, value) {
                currentOffset = checkChildNodes(value);
            });

            return currentOffset;
        }

        return checkChildNodes(el);
    };

    exports.getElementBySelection = function (selection) {
        var el = exports.getNearestCommonAncestor(selection.anchorNode, selection.focusNode);
        return Util.isTextNode(el) ? el.parentElement : el;
    };

    //NOTE: We can not determine first visible symbol of node in all cases,
    // so we should create a range and select all text contents of the node.
    // Then range object will contain information about node's the first and last visible symbol.
    exports.getFirstVisiblePosition = function (el) {
        var firstVisibleTextChild = el.nodeType === 3 ? el : exports.getFirstVisibleTextNode(el),
            curDocument = Util.findDocument(el),
            range = curDocument.createRange();

        if (firstVisibleTextChild) {
            range.selectNodeContents(firstVisibleTextChild);
            return exports.calculatePositionByNodeAndOffset(el, firstVisibleTextChild, range.startOffset);
        }
        return 0;
    };

    exports.getLastVisiblePosition = function (el) {
        var lastVisibleTextChild = el.nodeType === 3 ? el : exports.getLastVisibleTextNode(el, true),
            curDocument = Util.findDocument(el),
            range = curDocument.createRange();

        if (lastVisibleTextChild) {
            range.selectNodeContents(lastVisibleTextChild);
            return exports.calculatePositionByNodeAndOffset(el, lastVisibleTextChild, range.endOffset);
        }
        return 0;
    };

    //contents util
    exports.getContentEditableValue = function (target) {
        var elementValue = '',
            childNodes = target.childNodes;

        if (!Util.isRenderedNode(target))
            return elementValue;

        if (!target.childNodes.length && target.nodeType === 3)
            return target.nodeValue;
        else if (target.childNodes.length === 1 && target.childNodes[0].nodeType === 3)
            return target.childNodes[0].nodeValue;

        $.each(childNodes, function (index, value) {
            elementValue += exports.getContentEditableValue(value);
        });
        return elementValue;
    };
});
