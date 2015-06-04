var Hammerhead               = HammerheadClient.get('Hammerhead'),
    IFrameSandbox            = HammerheadClient.get('DOMSandbox.IFrame'),
    $                        = Hammerhead.$,
    JSProcessor              = Hammerhead.JSProcessor,
    SharedErrors             = TestCafeClient.get('Shared.Errors'),
    SharedConst              = TestCafeClient.get('Shared.Const'),
    Settings                 = TestCafeClient.get('Settings'),
    SelectorGenerator        = TestCafeClient.get('Recorder.SelectorGenerator'),
    JavascriptExecutor       = TestCafeClient.get('Base.JavascriptExecutor'),
    GeneratorRules           = TestCafeClient.get('Recorder.SelectorGenerator.Rules'),
    jQuerySelectorExtensions = TestCafeClient.get('Base.jQueryExtensions.Selectors'),
    Util                     = Hammerhead.Util;

Hammerhead.init();
jQuerySelectorExtensions.init();

Settings.RECORDING = true;

$(document).ready(function () {
    JavascriptExecutor.init();

    var MAX_TEXT_LENGTH_IN_SELECTOR                        = 150,
        //selector by tags tree becomes more of a priority when number of elements found by other selectors more than:
        ANCESTOR_AND_TAGS_TREE_RULE_VALIDITY_BOUND         = 10,
        TAGS_TREE_RULE_VALIDITY_BOUND                      = 20,
        IFRAME_READY_TIMEOUT                               = 100,
        CROSS_DOMAIN_IFRAME_READY_TIMEOUT                  = 500,

        ELEMENT_WHOSE                                      = 'element whose ',
        ATTRS_SEPARATOR                                    = ', ',
        CLASS_CONTAINS                                     = '{0} contains "{1}"',
        ID_IS                                              = '{0} is "{1}"',
        ATTR_VALUE_IS                                      = '{0} attribute value is "{1}"',
        ATTR_MATCHES_REGEXP                                = '{0} attribute value matches the regular expression "{1}"',
        ELEMENT_THAT_CONTAIN_TEXT                          = 'element that contains text "{0}", ignoring child node text',
        TAG_NAME_DESCRIPTION                               = '{0} element',
        SEARCH_INPUT_IN_FORM                               = 'Searches through descendants of the form {1} for an input {0}.',
        SEARCH_ELEMENT_BY_DOM_PATH                         = 'Searches through descendants of the <span>body</span> element for an element at a specific location in the DOM hierarchy: {0}.',
        SEARCH_ELEMENT_IN_ANCESTOR_BY_DOM_PATH             = 'Searches through descendants of the {1} for an element at a specific location in the DOM hierarchy: {0}.',
        NTH_ELEMENT_IS_RETURNED                            = 'The {0} matching element is returned',

        $container                                         = $(),

        generate                                           = function ($el) {
            qUnitElementsIgnoringByJQueryHelper.startIgnoring();
            try {
                var selectors = SelectorGenerator.generate($el);
            }
            catch (e) {
                qUnitElementsIgnoringByJQueryHelper.stopIgnoring();
                throw e;
            }
            qUnitElementsIgnoringByJQueryHelper.stopIgnoring();
            return selectors;
        },
        qUnitElementsIgnoringByJQueryHelper                = function () {
            var $qunitElements,
                startIgnoring = function () {
                    $qunitElements = $('#qunit-tests *');
                    $.each($qunitElements, function (index, el) {
                        el.className = el.className + ' .' + window.Hammerhead.TEST_CAFE_UI_CLASSNAME_POSTFIX;
                    });
                },
                stopIgnoring  = function () {
                    $.each($qunitElements, function (index, el) {
                        el.className = el.className.substring(0, el.className.indexOf(' .' +
                                                                                      window.Hammerhead.TEST_CAFE_UI_CLASSNAME_POSTFIX));
                    });
                };

            return {
                startIgnoring: startIgnoring,
                stopIgnoring:  stopIgnoring
            };
        }(),
        assertSelectors                                    = function ($element, selectors, expectedRuleIDs) {
            var results = [];
            strictEqual(selectors.length, expectedRuleIDs.length, 'check amount of selectors generated');
            qUnitElementsIgnoringByJQueryHelper.startIgnoring();
            try {
                for (var i = 0; i < selectors.length; i++) {
                    results.push(JavascriptExecutor.parseSelectorSync(selectors[i].selector).$elements);
                }
            }
            catch (e) {
                qUnitElementsIgnoringByJQueryHelper.stopIgnoring();
                throw e;
            }
            qUnitElementsIgnoringByJQueryHelper.stopIgnoring();

            for (var i = 0; i < results.length; i++) {
                strictEqual(results[i].length, 1, 'check amount of elements found by selector ' +
                                                  selectors[i].selector);
                strictEqual($element[0], results[i][0], 'check element found by selector ' + selectors[i].selector);
                strictEqual(selectors[i].id, expectedRuleIDs[i], 'check rule id is ' + expectedRuleIDs[i]);
            }
        },
        checkSelectorContainsContainsExcludeChildren       = function (selector) {
            var selectorContainsContainsExcludeChildren = new RegExp(':' +
                                                                     jQuerySelectorExtensions.CONTAINS_OWN_TEXT_METHOD_NAME +
                                                                     '\\(').test(selector);
            ok(selectorContainsContainsExcludeChildren,
                'check that selector ' + selector + ' contains ' +
                jQuerySelectorExtensions.CONTAINS_OWN_TEXT_METHOD_NAME + ' method');
            if (selectorContainsContainsExcludeChildren) {
                var textLength = selector.substring(selector.indexOf(jQuerySelectorExtensions.CONTAINS_OWN_TEXT_METHOD_NAME) +
                                                    jQuerySelectorExtensions.CONTAINS_OWN_TEXT_METHOD_NAME.length +
                                                    1, selector.lastIndexOf(')")')).length;
                ok(textLength <= MAX_TEXT_LENGTH_IN_SELECTOR, 'check that text was cut');
            }
        },
        checkSelectorContainsAttrRegExp                    = function (selector, attrName) {
            ok(new RegExp(':' + jQuerySelectorExtensions.ATTR_REGEXP_METHOD_NAME + '\\(' + attrName +
                          jQuerySelectorExtensions.REGEXP_START_SUBSTR).test(selector),
                'check that selector ' + selector + ' searches element by attribute ' + attrName + ' using regexp');
        },
        checkSelectorContainsAttr                          = function (selector, attrName) {
            if (attrName === 'id') {
                ok(/#/.test(selector), 'check that selector ' + selector + ' contains id');
            }
            else if (attrName === 'class') {
                ok(/\./.test(selector), 'check that selector ' + selector + ' contains class');
            }
            else {
                ok(new RegExp("\\[" + attrName + "=").test(selector),
                    'check that selector ' + selector + ' contains attribute ' + attrName);
            }
        },
        checkSelectorContainsTagsTree                      = function (selector, tagName) {
            ok(new RegExp(" > " + tagName + ":nth\\(").test(selector),
                'check that selector ' + selector + ' contains tags tree with tag ' + tagName);
        },
        checkSelectorContainsEq                            = function (selector) {
            ok(new RegExp(".eq\\(").test(selector),
                'check that selector ' + selector + ' contains eq() method');
        },
        checkAutogeneratedIDPartsReplacedWithRegExp        = function (selector) {
            ok(!/ctl\d+/.test(selector), 'parts of autogenerated id were not properly replaced with regexp in selector ' +
                                         selector);
        },
        formatString                                       = function (sourceString, args, dontWrapArguments) {
            var argumentNumber = 0;
            return sourceString.replace(/{(\d+)}/g, function (match) {
                var replacement = args[argumentNumber] ? args[argumentNumber] : '(\\s|\\S)+';
                argumentNumber++;
                return dontWrapArguments ? replacement : '<span>' + replacement + '<\\/span>';
            });
        },
        getDescriptionRegExpFromConst                      = function (descriptionConst, args) {
            var replaceRegExpSymbolsWithEscapeSequences = function (text) {
                return text.replace(/'|"|\(|\)|\||\-|\*|\?|\+|\\|\^|\$|\[|\]|\//g, function (substr) {
                    return '\\' + substr;
                })
            };
            return new RegExp(formatString(replaceRegExpSymbolsWithEscapeSequences(descriptionConst), args));
        },
        getNumberAsWordFromIndex                           = function (index) {
            var number    = index + 1,
                ending    = 'th',
                lastDigit = number % 10,
                prevDigit = (number % 100 - lastDigit) / 10;
            if (prevDigit !== 1) {
                if (lastDigit === 1) {
                    ending = 'st';
                }
                else if (lastDigit === 2) {
                    ending = 'nd';
                }
                else if (lastDigit === 3) {
                    ending = 'rd';
                }
            }
            return number.toString() + ending;
        },
        checkDescriptionContainsContainsExcludeChildren    = function (description, expectedTest) {
            var regExp = getDescriptionRegExpFromConst(ELEMENT_THAT_CONTAIN_TEXT, [expectedTest]);
            ok(regExp.test(description), 'check description contains containsExcludeChildren. Description: ' +
                                         description + '. RegExp to check: ' + regExp.toString());
        },
        checkDescriptionContainsClass                      = function (description, className) {
            var regExp = getDescriptionRegExpFromConst(ELEMENT_WHOSE + CLASS_CONTAINS, ['class', className]);
            ok(regExp.test(description), 'check description contains class. Description: ' + description +
                                         '. RegExp to check: ' + regExp.toString());
        },
        checkDescriptionContainsId                         = function (description, idValue) {
            var regExp = getDescriptionRegExpFromConst(ELEMENT_WHOSE + ID_IS, ['id', idValue]);
            ok(regExp.test(description), 'check description contains id. Description: ' + description +
                                         '. RegExp to check: ' + regExp.toString());
        },
        checkDescriptionContainsAttr                       = function (description, attrName, attrValue) {
            if (attrName === 'class') {
                checkDescriptionContainsClass(description, attrValue);
            }
            else if (attrName === 'id') {
                checkDescriptionContainsId(description, attrValue);
            }
            else {
                var regExp = getDescriptionRegExpFromConst(ELEMENT_WHOSE + ATTR_VALUE_IS, [attrName, attrValue]);
                ok(regExp.test(description), 'check description contains attr. Description: ' + description +
                                             '. RegExp to check: ' + regExp.toString());
            }
        },
        checkDescriptionContainsAttrRegExp                 = function (description, attrName, attrRexExp) {
            var regExp = getDescriptionRegExpFromConst(ELEMENT_WHOSE + ATTR_MATCHES_REGEXP, [attrName, attrRexExp]);
            ok(regExp.test(description), 'check description contains attr RegExp. Description: ' + description +
                                         '. RegExp to check: ' + regExp.toString());
        },
        checkDescriptionContainsAttributes                 = function (description, attributesInfo) {
            ok(new RegExp(ELEMENT_WHOSE).test(description), 'check description contains ' + ELEMENT_WHOSE);
            if (attributesInfo.length > 1) {
                ok(new RegExp(ATTRS_SEPARATOR).test(description), 'check description contains attributes separator');
            }
            for (var i = 0; i < attributesInfo.length; i++) {
                var regExp = null;
                if (attributesInfo[i].isRegExp) {
                    regExp = getDescriptionRegExpFromConst(ATTR_MATCHES_REGEXP, [attributesInfo[i].attr, attributesInfo[i].value]);
                }
                else if (attributesInfo[i].attr === 'class') {
                    regExp = getDescriptionRegExpFromConst(CLASS_CONTAINS, [attributesInfo[i].attr, attributesInfo[i].value]);
                }
                else if (attributesInfo[i].attr === 'id') {
                    regExp = getDescriptionRegExpFromConst(ID_IS, [attributesInfo[i].attr, attributesInfo[i].value]);
                }
                else {
                    regExp = getDescriptionRegExpFromConst(ATTR_VALUE_IS, [attributesInfo[i].attr, attributesInfo[i].value]);
                }
                ok(regExp.test(description), 'check description contains attr' + attributesInfo[i].attr +
                                             '. Description: ' + description + '. RegExp to check: ' +
                                             regExp.toString());
            }
        },
        checkDescriptionContainsInputInForm                = function (description, inputName, formAttr, formAttrValue) {
            var regExp = new RegExp(formatString(SEARCH_INPUT_IN_FORM, [], true));
            ok(regExp.test(description), 'check description describes selector for input with name in form with attr: ' +
                                         description + '. RegExp to check: ' + regExp.toString());
            checkDescriptionContainsAttr(description, 'name', inputName);
            checkDescriptionContainsAttr(description, formAttr, formAttrValue);
        },
        checkDescriptionContainsBody                       = function (description) {
            var regExp = getDescriptionRegExpFromConst(TAG_NAME_DESCRIPTION, ['body']);
            ok(regExp.test(description), 'check description describes body selector. Description: ' + description +
                                         '. RegExp to check: ' + regExp.toString());
        },
        checkDescriptionContainsHtml                       = function (description) {
            var regExp = getDescriptionRegExpFromConst(TAG_NAME_DESCRIPTION, ['html']);
            ok(regExp.test(description), 'check description describes html selector. Description: ' + description +
                                         '. RegExp to check: ' + regExp.toString());
        },
        checkDescriptionContainsDomPath                    = function (description) {
            var regExp = new RegExp(formatString(SEARCH_ELEMENT_BY_DOM_PATH, [], true));
            ok(regExp.test(description), 'check description contains DOM path: ' + description + '. RegExp to check: ' +
                                         regExp.toString());

        },
        checkDescriptionContainsAncestorWithTextAndDomPath = function (description, ancestorText) {
            var ancestorRegExp = getDescriptionRegExpFromConst(ELEMENT_THAT_CONTAIN_TEXT, [ancestorText]);
            var ancestorString = ancestorRegExp.toString();
            ancestorString     = ancestorString.substr(1, ancestorString.length - 2);
            var regExp         = new RegExp(formatString(SEARCH_ELEMENT_IN_ANCESTOR_BY_DOM_PATH, [ancestorString], true));
            ok(regExp.test(description), 'check description contains ancestor with text and DOM path: ' + description +
                                         '. RegExp to check: ' + regExp.toString());
        },
        checkDescriptionContainsAncestorWithIdAndDomPath   = function (description, id) {
            var ancestorRegExp = getDescriptionRegExpFromConst(ELEMENT_WHOSE + ID_IS, ['id', id]);
            var ancestorString = ancestorRegExp.toString();
            ancestorString     = ancestorString.substr(1, ancestorString.length - 2);
            var regExp         = new RegExp(formatString(SEARCH_ELEMENT_IN_ANCESTOR_BY_DOM_PATH, [ancestorString], true));
            ok(regExp.test(description), 'check description contains ancestor with id and DOM path: ' + description +
                                         '. RegExp to check: ' + regExp.toString());
        },
        checkDescriptionContainsAncestorWithAttrAndDomPath = function (description, attrName, attrValue) {
            var ancestorRegExp = getDescriptionRegExpFromConst(ELEMENT_WHOSE + ATTR_VALUE_IS, [attrName, attrValue]);
            var ancestorString = ancestorRegExp.toString();
            ancestorString     = ancestorString.substr(1, ancestorString.length - 2);
            var regExp         = new RegExp(formatString(SEARCH_ELEMENT_IN_ANCESTOR_BY_DOM_PATH, [ancestorString], true));
            ok(regExp.test(description), 'check description contains ancestor with attr and DOM path: ' + description +
                                         '. RegExp to check: ' + regExp.toString());
        },
        checkDescriptionContainsNthChild                   = function (description, index, tagName) {
            var regExp = new RegExp(getNumberAsWordFromIndex(index) + ' ' + tagName);
            ok(regExp.test(description), 'check description contains nth child: ' + description +
                                         '. RegExp to check: ' + regExp.toString());
        },
        checkDescriptionContainsEq                         = function (description, index) {
            var regExp = getDescriptionRegExpFromConst(NTH_ELEMENT_IS_RETURNED, [getNumberAsWordFromIndex(index)]);
            ok(regExp.test(description), 'check description contains eq: ' + description + '. RegExp to check: ' +
                                         regExp.toString());
        },

        setDoubleTimeout                                   = function (callback, timeout) {
            if (!timeout) {
                timeout = 0;
            }
            window.setTimeout(function () {
                window.setTimeout(callback, timeout);
            }, 0);
        },
        startNext                                          = function () {
            setDoubleTimeout(start);
        };

    var handler = function (e) {
        e.iframe.contentWindow.eval.call(e.iframe.contentWindow, [
            'HammerheadClient.define(\'Settings\', function (require, exports) {',
            '    exports.JOB_OWNER_TOKEN = "ownerToken";',
            '    exports.JOB_UID = "jobUid";',
            '});',
            'var UrlUtil = HammerheadClient.get("UrlUtil");',
            'UrlUtil.OriginLocation.get = function() { return "https://example.com"; };',
            'HammerheadClient.get(\'Hammerhead\').init();'
        ].join(''));
    };

    QUnit.testStart = function () {
        $container = $('<div></div>').appendTo('body');
        IFrameSandbox.on(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
        IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, IFrameSandbox.iframeReadyToInitHandler);
    };

    QUnit.testDone = function () {
        $container.remove();
        IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
    };

    module('generating rules');

    asyncTest('element with id', function () {
        var testId      = 'testId';
        var $elemWithId = $('<div></div>').attr('id', testId).appendTo($container);
        var selectors   = generate($elemWithId);
        assertSelectors($elemWithId, selectors, [GeneratorRules.ruleIDs.BY_ID, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttr(selectors[0].selector, 'id');
        checkDescriptionContainsId(selectors[0].description, testId);

        startNext();
    });

    asyncTest('elements with ASP autogenerated id', function () {
        var $elemWithId = $('<div></div>').attr('id', 'ctl02').appendTo($container);
        var selectors   = generate($elemWithId);
        assertSelectors($elemWithId, selectors, [GeneratorRules.ruleIDs.BY_ID, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttrRegExp(selectors[0].selector, 'id');
        checkAutogeneratedIDPartsReplacedWithRegExp(selectors[0].selector);
        checkDescriptionContainsAttrRegExp(selectors[0].description, 'id', '');

        $elemWithId = $('<div></div>').attr('id', 'test1_ctl03_test2').appendTo($container);
        selectors   = generate($elemWithId);
        assertSelectors($elemWithId, selectors, [GeneratorRules.ruleIDs.BY_ID, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttrRegExp(selectors[0].selector, 'id');
        checkAutogeneratedIDPartsReplacedWithRegExp(selectors[0].selector);
        checkDescriptionContainsAttrRegExp(selectors[0].description, 'id', '');

        $elemWithId = $('<div></div>').attr('id', 'test_ctl23').appendTo($container);
        selectors   = generate($elemWithId);
        assertSelectors($elemWithId, selectors, [GeneratorRules.ruleIDs.BY_ID, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttrRegExp(selectors[0].selector, 'id');
        checkAutogeneratedIDPartsReplacedWithRegExp(selectors[0].selector);
        checkDescriptionContainsAttrRegExp(selectors[0].description, 'id', '');

        $elemWithId = $('<div></div>').attr('id', 'ctl00_Test').appendTo($container);
        selectors   = generate($elemWithId);
        assertSelectors($elemWithId, selectors, [GeneratorRules.ruleIDs.BY_ID, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttrRegExp(selectors[0].selector, 'id');
        checkAutogeneratedIDPartsReplacedWithRegExp(selectors[0].selector);
        checkDescriptionContainsAttrRegExp(selectors[0].description, 'id', '');

        $elemWithId = $('<div></div>').attr('id', 'ctl01_test1_test2_ctl02_test3_ctl04').appendTo($container);
        selectors   = generate($elemWithId);
        assertSelectors($elemWithId, selectors, [GeneratorRules.ruleIDs.BY_ID, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttrRegExp(selectors[0].selector, 'id');
        checkAutogeneratedIDPartsReplacedWithRegExp(selectors[0].selector);
        checkDescriptionContainsAttrRegExp(selectors[0].description, 'id', '');

        startNext();
    });

    asyncTest('element with text', function () {
        var text          = 'text';
        var $elemWithText = $('<div></div>').text(text).appendTo($container);
        var selectors     = generate($elemWithText);
        assertSelectors($elemWithText, selectors, [GeneratorRules.ruleIDs.BY_TEXT, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsContainsExcludeChildren(selectors[0].selector);
        checkDescriptionContainsContainsExcludeChildren(selectors[0].description, text);

        startNext();
    });

    asyncTest('element without own text having children with text', function () {
        var $elemWithoutText = $('<div></div>').appendTo($container);
        $('<div></div>').text('text').appendTo($elemWithoutText);
        var selectors        = generate($elemWithoutText);
        assertSelectors($elemWithoutText, selectors, [GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        ok(!(new RegExp(jQuerySelectorExtensions.CONTAINS_OWN_TEXT_METHOD_NAME).test(selectors[0].selector)), 'check that selector does not contain own text');
        checkSelectorContainsTagsTree(selectors[0].selector, 'div');
        checkDescriptionContainsDomPath(selectors[0].description);
        checkDescriptionContainsNthChild(selectors[0].description, 0, 'div');

        startNext();
    });

    asyncTest('element with very long text', function () {
        var text                 = 'this text is too long to generate a selector with it because that selector would be not readable because the text is so long that i have never seen such long text before J';
        var $elementWithLongText = $('<div></div>').text(text).appendTo($container);
        var selectors            = generate($elementWithLongText);
        assertSelectors($elementWithLongText, selectors, [GeneratorRules.ruleIDs.BY_TEXT, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsContainsExcludeChildren(selectors[0].selector);
        checkDescriptionContainsContainsExcludeChildren(selectors[0].description, text.substr(0, MAX_TEXT_LENGTH_IN_SELECTOR));

        startNext();
    });

    asyncTest('element with text containing non-alphanumeric characters', function () {
        var $elemWithText = $('<div></div>').text('text ( " ) \' \n \r # ! % @ ^ text & *').appendTo($container);
        var selectors     = generate($elemWithText);
        assertSelectors($elemWithText, selectors, [GeneratorRules.ruleIDs.BY_TEXT, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsContainsExcludeChildren(selectors[0].selector);
        checkDescriptionContainsContainsExcludeChildren(selectors[0].description, 'text text');

        startNext();
    });

    asyncTest('element with text containing another element with text', function () {
        var $elemWithText      = $('<div>some text <span>and text</span> and another text</div>').appendTo($container);
        var $childElemWithText = $elemWithText.find('span');
        var parentSelectors    = generate($elemWithText);
        assertSelectors($elemWithText, parentSelectors, [GeneratorRules.ruleIDs.BY_TEXT, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsContainsExcludeChildren(parentSelectors[0].selector);
        var childSelectors     = generate($childElemWithText);
        assertSelectors($childElemWithText, childSelectors, [GeneratorRules.ruleIDs.BY_TEXT, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_TEXT_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsContainsExcludeChildren(childSelectors[0].selector);
        ok(/some text/.test(parentSelectors[0].selector) &&
           /and another text/.test(parentSelectors[0].selector), 'check selector contains element\'s text');
        ok(!/and text/.test(parentSelectors[0].selector), 'check selector does not contain child element\'s text');
        checkDescriptionContainsContainsExcludeChildren(parentSelectors[0].description, 'some text and another text');
        ok(/and text/.test(childSelectors[0].selector), 'check child selector contains element\'s text');
        checkDescriptionContainsContainsExcludeChildren(childSelectors[0].description, 'and text');

        startNext();
    });

    asyncTest('elements with text within element with id', function () {
        var $elemWithId             = $('<div></div>').attr('id', 'someId').appendTo($container);
        var $elemWithText           = $('<div></div>').text('some text').appendTo($elemWithId);
        var $anotherElementWithText = $('<div></div>').text('another text').appendTo($('<div></div>').appendTo($('<div></div>').appendTo($elemWithId)));
        var selectors               = generate($elemWithText);
        var anotherSelectors        = generate($anotherElementWithText);
        assertSelectors($elemWithText, selectors, [GeneratorRules.ruleIDs.BY_TEXT, GeneratorRules.ruleIDs.BY_ANCESTOR_AND_TEXT, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_ATTR_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsContainsExcludeChildren(selectors[1].selector);
        checkSelectorContainsAttr(selectors[1].selector, 'id');
        checkDescriptionContainsId(selectors[1].description, 'someId');
        checkDescriptionContainsContainsExcludeChildren(selectors[1].description, 'some text');
        assertSelectors($anotherElementWithText, anotherSelectors, [GeneratorRules.ruleIDs.BY_TEXT, GeneratorRules.ruleIDs.BY_ANCESTOR_AND_TEXT, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_ATTR_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsContainsExcludeChildren(anotherSelectors[1].selector);
        checkSelectorContainsAttr(anotherSelectors[1].selector, 'id');
        checkDescriptionContainsId(anotherSelectors[1].description, 'someId');
        checkDescriptionContainsContainsExcludeChildren(anotherSelectors[1].description, 'another text');

        startNext();
    });

    asyncTest('element with class', function () {
        var $elemWithClass = $('<div></div>').attr('class', 'someClass').appendTo($container);
        var selectors      = generate($elemWithClass);
        assertSelectors($elemWithClass, selectors, [GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttr(selectors[0].selector, 'class');
        ok(/\.[a-z]/.test(selectors[0].selector), 'check that element selector looks like dot+className');
        checkDescriptionContainsClass(selectors[0].description, 'someClass');

        startNext();
    });

    asyncTest('img with alt', function () {
        var $elemWithAlt = $('<img></img>').attr('alt', 'someAlt').appendTo($container);
        var selectors    = generate($elemWithAlt);
        assertSelectors($elemWithAlt, selectors, [GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttr(selectors[0].selector, 'alt');
        checkDescriptionContainsAttr(selectors[0].description, 'alt', 'someAlt');

        startNext();
    });

    asyncTest('element with attributes not acceptable for selectors', function () {
        var $elemWithOnclick = $('<div></div>').attr('onclick', 'console.log("click")').appendTo($container);
        var selectors        = generate($elemWithOnclick);
        assertSelectors($elemWithOnclick, selectors, [GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsTagsTree(selectors[0].selector, 'div');
        checkDescriptionContainsDomPath(selectors[0].description);
        checkDescriptionContainsNthChild(selectors[0].description, 0, 'div');

        startNext();
    });

    asyncTest('element with ASP autogenerated name', function () {
        var $elemWithClass = $('<div></div>').attr('name', 'ctl08$test1$test2$ctl02$test3$ctl04').appendTo($container);
        var selectors      = generate($elemWithClass);
        assertSelectors($elemWithClass, selectors, [GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttrRegExp(selectors[0].selector, 'name');
        checkAutogeneratedIDPartsReplacedWithRegExp(selectors[0].selector);
        checkDescriptionContainsAttrRegExp(selectors[0].description, 'name', '');

        startNext();
    });

    asyncTest('elements with attr containing unallowed symbols', function () {
        var $elem     = $('<div></div>').attr('data-source', '          thisDiv  \n contains        separators                    and line feed           and          *     +  \   /        : ^ - ? |            and       (     )      ~`!@#$%^&*()_-+=\|/[]{}\'?.,><12390         {              \'                  }            ').appendTo($container);
        var selectors = generate($elem);
        assertSelectors($elem, selectors, [GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttrRegExp(selectors[0].selector, 'data-source');
        checkDescriptionContainsAttrRegExp(selectors[0].description, 'data-source', '');

        startNext();
    });

    asyncTest('element with attr containing non-alphanumeric symbols', function () {
        var $elem            = $('<div></div>').attr('data-attr', 'thisDiv\'Contains\'quotes and"double"quotes').appendTo($container);
        var $anotherElem     = $('<div></div>').attr('data-item', "aaa'aaa123490!@#$%^&*()-_=+\|/[]?.,><~`{}name").appendTo($container);
        var selectors        = generate($elem);
        var anotherSelectors = generate($anotherElem);
        assertSelectors($elem, selectors, [GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttr(selectors[0].selector, 'data-attr');
        checkDescriptionContainsAttr(selectors[0].description, 'data-attr', 'thisDiv\\\\\'Contains\\\\\'quotes and\\\\"double\\\\"quotes');
        assertSelectors($anotherElem, anotherSelectors, [GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttr(anotherSelectors[0].selector, 'data-item');
        checkDescriptionContainsAttr(anotherSelectors[0].description, 'data-item', '');

        startNext();
    });

    asyncTest('element with attr with too long value', function () {
        var $elem     = $('<div></div>').attr('data-city', 'Krungthepmahanakhon Amornrattanakosin Mahintharayutthaya Mahadilokphop Noppharat Ratchathaniburirom Udomratchaniwetmahasathan Amonphiman Awatansathit Sakkathattiyawitsanukamprasit').appendTo($container);
        var selectors = generate($elem);
        assertSelectors($elem, selectors, [GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttrRegExp(selectors[0].selector, 'data-city');
        ok(/\$/.test(selectors[0].selector), 'check that selector does not contain end of string symbol in regexp');
        checkDescriptionContainsAttrRegExp(selectors[0].description, 'data-city', '\\^' +
                                                                                  $elem.attr('data-city').substring(0, MAX_TEXT_LENGTH_IN_SELECTOR));

        startNext();
    });

    asyncTest('element with several attributes', function () {
        var $elemWithSeveralAttrs = $('<div></div>').attr({
            class: 'someClass',
            name:  'someName',
            alt:   'someAlt'
        }).attr('data-attr', 'ыть    \   ыть / ').appendTo($container);
        var selectors             = generate($elemWithSeveralAttrs);
        assertSelectors($elemWithSeveralAttrs, selectors, [GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttr(selectors[0].selector, 'class');
        checkSelectorContainsAttr(selectors[0].selector, 'name');
        checkSelectorContainsAttr(selectors[0].selector, 'alt');
        checkSelectorContainsAttrRegExp(selectors[0].selector, 'data-attr');
        checkDescriptionContainsAttributes(selectors[0].description, [
            { attr: 'class', value: 'someClass' },
            { attr: 'name', value: 'someName' },
            { attr: 'alt', value: 'someAlt' },
            { attr: 'data-attr', value: '\\^ыть\\\\s\\+ыть \\/ \\$', isRegExp: true }
        ]);

        startNext();
    });

    asyncTest('elements with attr within element with id', function () {
        var $elemWithId          = $('<div></div>').attr('id', 'someId').appendTo($container);
        var $elemWithName        = $('<div></div>').attr('name', 'someName').appendTo($elemWithId);
        var $anotherElemWithId   = $('<div></div>').attr('id', 'anotherId').appendTo($elemWithId);
        var $anotherElemWithName = $('<div></div>').attr('name', 'anotherName').appendTo($anotherElemWithId);
        var selectors            = generate($elemWithName);
        var anotherSelectors     = generate($anotherElemWithName);
        assertSelectors($elemWithName, selectors, [GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_AND_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_ATTR_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttr(selectors[1].selector, 'name');
        checkSelectorContainsAttr(selectors[1].selector, 'id');
        checkDescriptionContainsAttr(selectors[1].description, 'name', 'someName');
        checkDescriptionContainsId(selectors[1].description, 'someId');
        assertSelectors($anotherElemWithName, anotherSelectors, [GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_AND_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_ATTR_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttr(anotherSelectors[1].selector, 'name');
        checkSelectorContainsAttr(anotherSelectors[1].selector, 'id');
        ok(/anotherId/.test(anotherSelectors[1].selector), 'check that child element\'s id was used');
        checkDescriptionContainsAttr(anotherSelectors[1].description, 'name', 'anotherName');
        checkDescriptionContainsId(anotherSelectors[1].description, 'anotherId');

        startNext();
    });

    asyncTest('Don\'t take into account TestCafeClient added attributes', function () {
        var attrName                   = 'href',
            addedUrlAttribute          = Hammerhead.getStoredAttrName(attrName),
            value                      = 'value',

            $divWithUrlAttrKey         = $('<div></div>').attr(addedUrlAttribute, value).appendTo($container),
            divWithUrlAttrKeySelectors = generate($divWithUrlAttrKey);

        assertSelectors($divWithUrlAttrKey, divWithUrlAttrKeySelectors, [GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        strictEqual(new RegExp(addedUrlAttribute).test(divWithUrlAttrKeySelectors[0].selector), false);

        startNext();
    });

    asyncTest('element without identifiers within element with text which has a parent with id', function () {
        var $elemWithId   = $('<div></div>').attr('id', 'someId').appendTo($container);
        var $elemWithText = $('<div></div>').text('text').appendTo($elemWithId);
        var $elem         = $('<span></span>').appendTo($elemWithText);
        var selectors     = generate($elem);
        assertSelectors($elem, selectors, [GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_ATTR_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_TEXT_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsTagsTree(selectors[0].selector, 'span');
        checkSelectorContainsTagsTree(selectors[0].selector, 'div');
        checkDescriptionContainsAncestorWithIdAndDomPath(selectors[0].description, 'someId');
        checkDescriptionContainsNthChild(selectors[0].description, 0, 'div');
        checkDescriptionContainsNthChild(selectors[0].description, 0, 'span');
        checkSelectorContainsTagsTree(selectors[1].selector, 'span');
        checkDescriptionContainsAncestorWithTextAndDomPath(selectors[1].description, 'text');
        checkDescriptionContainsNthChild(selectors[1].description, 0, 'span');

        startNext();
    });

    asyncTest('element without identifiers within element with name which has a parent with text', function () {
        var $elemWithText          = $('<div></div>').text('text').appendTo($container);
        var $firstIntermediateDiv  = $('<div></div>').appendTo($elemWithText);
        var $secondIntermediateDiv = $('<div></div>').appendTo($elemWithText);
        var $elemWithName          = $('<span></span>').attr('name', 'someName').appendTo($secondIntermediateDiv);
        var $elem                  = $('<a></a>').appendTo($elemWithName);
        var selectors              = generate($elem);
        assertSelectors($elem, selectors, [GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_ATTR_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_TEXT_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsTagsTree(selectors[0].selector, 'a');
        checkDescriptionContainsAncestorWithAttrAndDomPath(selectors[0].description, 'name', 'someName');
        checkDescriptionContainsNthChild(selectors[0].description, 0, 'a');
        checkSelectorContainsTagsTree(selectors[1].selector, 'div');
        checkSelectorContainsTagsTree(selectors[1].selector, 'span');
        checkSelectorContainsTagsTree(selectors[1].selector, 'a');
        checkDescriptionContainsAncestorWithTextAndDomPath(selectors[1].description, 'text');
        checkDescriptionContainsNthChild(selectors[1].description, 1, 'div');
        checkDescriptionContainsNthChild(selectors[1].description, 0, 'span');
        checkDescriptionContainsNthChild(selectors[1].description, 0, 'a');

        startNext();
    });

    asyncTest('element without identifiers', function () {
        var $div        = $('<div></div>').appendTo($container);
        var $firstSpan  = $('<span></span>').appendTo($div);
        var $secondSpan = $('<span></span>').appendTo($div);
        var $thirdSpan  = $('<span></span>').appendTo($div);
        var $firstB     = $('<b></b>').appendTo($secondSpan);
        var $secondB    = $('<b></b>').appendTo($secondSpan);
        var $thirdB     = $('<b></b>').appendTo($secondSpan);
        var selectors   = generate($thirdB);
        assertSelectors($thirdB, selectors, [GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsTagsTree(selectors[0].selector, 'div');
        checkSelectorContainsTagsTree(selectors[0].selector, 'span');
        checkSelectorContainsTagsTree(selectors[0].selector, 'b');
        ok(/body/.test(selectors[0].selector), 'check selector contains body');
        checkDescriptionContainsDomPath(selectors[0].description);
        checkDescriptionContainsNthChild(selectors[0].description, 0, 'div');
        checkDescriptionContainsNthChild(selectors[0].description, 1, 'span');
        checkDescriptionContainsNthChild(selectors[0].description, 2, 'b');

        startNext();
    });

    asyncTest('input element within form with title', function () {
        var $form     = $('<form></form>').attr('title', 'someTitle').appendTo($container);
        var $input    = $('<input type="text"/>').attr('name', 'someName').appendTo($form);
        var selectors = generate($input);
        assertSelectors($input, selectors, [GeneratorRules.ruleIDs.BY_INPUT_NAME_AND_FORM, GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_ATTR_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttr(selectors[0].selector, 'title');
        checkSelectorContainsAttr(selectors[0].selector, 'name');
        checkDescriptionContainsInputInForm(selectors[0].description, 'someName', 'title', 'someTitle');

        startNext();
    });

    asyncTest('input element within form with id', function () {
        var $form     = $('<form></form>').attr('id', 'someId').appendTo($container);
        var $input    = $('<input type="text"/>').attr('name', 'someName').appendTo($form);
        var selectors = generate($input);
        assertSelectors($input, selectors, [GeneratorRules.ruleIDs.BY_INPUT_NAME_AND_FORM, GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_ATTR_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttr(selectors[0].selector, 'id');
        checkSelectorContainsAttr(selectors[0].selector, 'name');
        checkDescriptionContainsInputInForm(selectors[0].description, 'someName', 'id', 'someId');

        startNext();
    });

    asyncTest('input element within container with id within form with id', function () {
        var $form           = $('<form></form>').attr('id', 'formId').appendTo($container);
        var $inputContainer = $('<div></div>').attr('id', 'anotherId').appendTo($form);
        var $input          = $('<input type="text"/>').attr('name', 'someName').appendTo($inputContainer);
        var selectors       = generate($input);
        assertSelectors($input, selectors, [GeneratorRules.ruleIDs.BY_INPUT_NAME_AND_FORM, GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_AND_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_ATTR_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsAttr(selectors[0].selector, 'name');
        checkSelectorContainsAttr(selectors[0].selector, 'id');
        ok(/#formId/.test(selectors[0].selector), 'check selector uses form id');
        checkDescriptionContainsInputInForm(selectors[0].description, 'someName', 'id', 'formId');

        startNext();
    });

    asyncTest('html element', function () {
        var $html     = $('html');
        var selectors = generate($html);
        assertSelectors($html, selectors, [GeneratorRules.ruleIDs.FOR_HTML]);
        ok(/html/.test(selectors[0].selector), 'check selector contains html');
        checkDescriptionContainsHtml(selectors[0].description);

        startNext();
    });

    asyncTest('body element', function () {
        var $body     = $('body');
        var selectors = generate($body);
        assertSelectors($body, selectors, [GeneratorRules.ruleIDs.FOR_BODY]);
        ok(/body/.test(selectors[0].selector), 'check selector contains body');
        checkDescriptionContainsBody(selectors[0].description);

        startNext();
    });

    asyncTest('iframe html element', function () {
        var $iframe = $('<iframe></iframe>').appendTo($container);
        setDoubleTimeout(function () {
            var $html     = $('html', $iframe.contents());
            var selectors = generate($html);
            assertSelectors($html, selectors, [GeneratorRules.ruleIDs.FOR_HTML]);
            checkSelectorContainsTagsTree(selectors[0].selector, 'iframe');
            ok(/html/.test(selectors[0].selector), 'check selector contains html');
            checkDescriptionContainsHtml(selectors[0].description);

            startNext();
        }, IFRAME_READY_TIMEOUT);
    });

    asyncTest('iframe body element', function () {
        var $firstIframe  = $('<iframe></iframe>').appendTo($container);
        var $secondIframe = $('<iframe></iframe>').appendTo($container);
        setDoubleTimeout(function () {
            var $body     = $('body', $secondIframe.contents());
            var selectors = generate($body);
            assertSelectors($body, selectors, [GeneratorRules.ruleIDs.FOR_BODY]);
            checkSelectorContainsTagsTree(selectors[0].selector, 'iframe');
            ok(/body/.test(selectors[0].selector), 'check selector contains body');
            checkDescriptionContainsBody(selectors[0].description);

            startNext();
        }, IFRAME_READY_TIMEOUT);
    });

    asyncTest('element with class in iframe with name', function () {
        var $firstIframe  = $('<iframe></iframe>').attr('name', 'someName').appendTo($container);
        var $secondIframe = $('<iframe></iframe>').attr('name', 'otherName').appendTo($container);
        setDoubleTimeout(function () {
            var $el       = $('<div></div>').attr('class', 'someClass').appendTo($('body', $secondIframe.contents()));
            var selectors = generate($el);
            assertSelectors($el, selectors, [GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
            checkSelectorContainsAttr(selectors[0].selector, 'name');
            checkSelectorContainsAttr(selectors[0].selector, 'class');
            checkDescriptionContainsClass(selectors[0].description, 'someClass');

            startNext();
        }, IFRAME_READY_TIMEOUT);
    });

    asyncTest('element with text inside element with id in iframe with id', function () {
        var $firstIframe  = $('<iframe></iframe>').attr('name', 'someName').appendTo($container);
        var $secondIframe = $('<iframe></iframe>').attr('id', 'someId').appendTo($container);
        var $thirdIframe  = $('<iframe></iframe>').attr('id', 'otherId').appendTo($container);
        setDoubleTimeout(function () {
            var $parent   = $('<div></div>').attr('id', 'parentId').appendTo($('body', $secondIframe.contents()));
            var $el       = $('<span></span>').text('text').appendTo($parent);
            var selectors = generate($el);
            assertSelectors($el, selectors, [GeneratorRules.ruleIDs.BY_TEXT, GeneratorRules.ruleIDs.BY_ANCESTOR_AND_TEXT, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_ATTR_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
            checkSelectorContainsContainsExcludeChildren(selectors[0].selector);
            checkDescriptionContainsContainsExcludeChildren(selectors[0].description, 'text');
            checkSelectorContainsAttr(selectors[1].selector, 'id');
            checkSelectorContainsContainsExcludeChildren(selectors[1].selector);
            checkDescriptionContainsContainsExcludeChildren(selectors[1].description, 'text');
            checkDescriptionContainsId(selectors[1].description, 'parentId');
            checkSelectorContainsTagsTree(selectors[2].selector, 'span');
            checkDescriptionContainsAncestorWithIdAndDomPath(selectors[2].description, 'parentId');
            checkDescriptionContainsNthChild(selectors[2].description, 0, 'span');
            checkSelectorContainsTagsTree(selectors[3].selector, 'span');
            checkDescriptionContainsDomPath(selectors[3].description);
            checkDescriptionContainsNthChild(selectors[3].description, 0, 'div');
            checkDescriptionContainsNthChild(selectors[3].description, 0, 'span');
            startNext();
        }, IFRAME_READY_TIMEOUT);
    });

    asyncTest('element without identifiers within iframe without identifiers', function () {
        var $firstIframeContainer  = $('<div></div>').appendTo($container);
        var $secondIframeContainer = $('<div></div>').appendTo($container);
        var $firstIframe           = $('<iframe></iframe>').appendTo($firstIframeContainer);
        var $secondIframe          = $('<iframe></iframe>').appendTo($secondIframeContainer);
        var $thirdIframe           = $('<iframe></iframe>').appendTo($container);
        setDoubleTimeout(function () {
            var $firstDiv  = $('<div></div>').appendTo($('body', $secondIframe.contents()));
            var $secondDiv = $('<div></div>').appendTo($('body', $secondIframe.contents()));
            var $thirdDiv  = $('<div></div>').appendTo($('body', $secondIframe.contents()));
            var $forthDiv  = $('<div></div>').appendTo($('body', $secondIframe.contents()));
            var $firstA    = $('<a></a>').appendTo($thirdDiv);
            var $secondA   = $('<a></a>').appendTo($thirdDiv);
            var selectors  = generate($secondA);
            assertSelectors($secondA, selectors, [GeneratorRules.ruleIDs.BY_TAGS_TREE]);
            checkSelectorContainsTagsTree(selectors[0].selector, 'iframe');
            checkSelectorContainsTagsTree(selectors[0].selector, 'div');
            checkSelectorContainsTagsTree(selectors[0].selector, 'a');
            ok(/body/.test(selectors[0].selector), 'check selector contains body');
            checkDescriptionContainsDomPath(selectors[0].description);
            checkDescriptionContainsNthChild(selectors[0].description, 1, 'div');
            checkDescriptionContainsNthChild(selectors[0].description, 1, 'a');

            startNext();
        }, IFRAME_READY_TIMEOUT);
    });

    asyncTest('element with class and non-unique text', function () {
        var testText    = 'testText';
        var $div1       = $('<div></div>').appendTo($container);
        var $currentDiv = $('<div></div>').text(testText).attr('class', 'someClass').appendTo($container);
        var $div3       = $('<div></div>').appendTo($container);

        var selectors = generate($currentDiv);
        assertSelectors($currentDiv, selectors, [GeneratorRules.ruleIDs.BY_TEXT, GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkDescriptionContainsContainsExcludeChildren(selectors[0].description, testText);

        $container.find('div').text(testText);
        selectors     = generate($currentDiv);
        assertSelectors($currentDiv, selectors, [GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TEXT, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsEq(selectors[1].selector);
        checkDescriptionContainsEq(selectors[1].description, 1);
        checkDescriptionContainsClass(selectors[0].description, 'someClass');

        startNext();
    });

    asyncTest('element with class and text equal to other element class and text', function () {
        var testText    = 'testText';
        var $div1       = $('<div></div>').text(testText).attr('class', 'someClass').appendTo($container);
        var $currentDiv = $('<div></div>').text(testText).attr('class', 'someClass').appendTo($container);
        var selectors   = generate($currentDiv);
        assertSelectors($currentDiv, selectors, [GeneratorRules.ruleIDs.BY_TEXT, GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsEq(selectors[0].selector);
        checkDescriptionContainsEq(selectors[0].description, 1);
        checkDescriptionContainsContainsExcludeChildren(selectors[0].description, testText);
        checkSelectorContainsEq(selectors[1].selector);
        checkDescriptionContainsEq(selectors[1].description, 1);
        checkDescriptionContainsClass(selectors[1].description, 'someClass');

        startNext();
    });

    asyncTest('element with text equal to two other elements text and class equal to one other element class', function () {
        var testText    = 'testText';
        var $div1       = $('<div></div>').text(testText).attr('class', 'someClass').appendTo($container);
        var $currentDiv = $('<div></div>').text(testText).attr('class', 'someClass').appendTo($container);
        var $div3       = $('<div></div>').text(testText).appendTo($container);
        var selectors   = generate($currentDiv);
        assertSelectors($currentDiv, selectors, [GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TEXT, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsEq(selectors[0].selector);
        checkDescriptionContainsEq(selectors[0].description, 1);
        checkDescriptionContainsClass(selectors[0].description, 'someClass');
        checkSelectorContainsEq(selectors[1].selector);
        checkDescriptionContainsEq(selectors[1].description, 1);
        checkDescriptionContainsContainsExcludeChildren(selectors[1].description, testText);

        startNext();
    });

    asyncTest('element with class equal to ' + ANCESTOR_AND_TAGS_TREE_RULE_VALIDITY_BOUND +
              ' other classes within element with id', function () {
        var $containerWithId = $('<div></div>').attr('id', 'someId').appendTo($container);
        for (var i = 0; i < ANCESTOR_AND_TAGS_TREE_RULE_VALIDITY_BOUND; i++) {
            var $div = $('<div></div>').attr('class', 'someClass').appendTo($containerWithId);
        }
        var $currentDiv = $('<div></div>').attr('class', 'someClass').appendTo($containerWithId);
        var selectors   = generate($currentDiv);
        assertSelectors($currentDiv, selectors, [GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_ATTR_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_AND_ATTR, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        checkSelectorContainsEq(selectors[1].selector);
        checkDescriptionContainsEq(selectors[1].description, ANCESTOR_AND_TAGS_TREE_RULE_VALIDITY_BOUND);

        startNext();
    });

    asyncTest('element with class equal to 4 other classes and text equal to ' + TAGS_TREE_RULE_VALIDITY_BOUND +
              ' other texts', function () {
        for (var i = 0; i < TAGS_TREE_RULE_VALIDITY_BOUND; i++) {
            var $div = $('<div></div>').text('someText').appendTo($container);
            if (i < 4) {
                $div.attr('class', 'someClass');
            }
        }
        var $currentDiv = $('<div></div>').attr('class', 'someClass').text('someText').appendTo($container);
        var selectors   = generate($currentDiv);
        assertSelectors($currentDiv, selectors, [GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TAGS_TREE, GeneratorRules.ruleIDs.BY_TEXT]);
        checkSelectorContainsAttr(selectors[0].selector, 'class');
        checkSelectorContainsEq(selectors[0].selector);
        checkDescriptionContainsEq(selectors[0].description, 4);
        checkSelectorContainsTagsTree(selectors[1].selector, 'div');
        checkSelectorContainsContainsExcludeChildren(selectors[2].selector);
        checkSelectorContainsEq(selectors[2].selector);
        checkDescriptionContainsEq(selectors[2].description, TAGS_TREE_RULE_VALIDITY_BOUND);

        startNext();
    });

    asyncTest('all selectors for div', function () {
        var $parentDiv = $('<div></div>').appendTo($container);
        var $div       = $('<div></div>').appendTo($parentDiv);

        var selectors = generate($div);
        assertSelectors($div, selectors, [GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        strictEqual(selectors.length, 1, 'amount of generated selectors checked');
        checkSelectorContainsTagsTree(selectors[0].selector, 'div');

        $div.attr('class', 'someClass');
        selectors     = generate($div);
        assertSelectors($div, selectors, [GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        strictEqual(selectors.length, 2, 'amount of generated selectors checked after class adding');
        checkSelectorContainsAttr(selectors[0].selector, 'class');

        $div.text('someText');
        selectors     = generate($div);
        assertSelectors($div, selectors, [GeneratorRules.ruleIDs.BY_TEXT, GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        strictEqual(selectors.length, 3, 'amount of generated selectors checked after text adding');
        checkSelectorContainsContainsExcludeChildren(selectors[0].selector);

        $div.attr('id', 'someId');
        selectors     = generate($div);
        assertSelectors($div, selectors, [GeneratorRules.ruleIDs.BY_ID, GeneratorRules.ruleIDs.BY_TEXT, GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        strictEqual(selectors.length, 4, 'amount of generated selectors checked after id adding');
        checkSelectorContainsAttr(selectors[0].selector, 'id');

        $parentDiv.attr('id', 'parentId');
        selectors     = generate($div);
        assertSelectors($div, selectors, [GeneratorRules.ruleIDs.BY_ID, GeneratorRules.ruleIDs.BY_TEXT, GeneratorRules.ruleIDs.BY_ANCESTOR_AND_TEXT, GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_AND_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_ATTR_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        strictEqual(selectors.length, 7, 'amount of generated selectors checked after parent id adding');

        var text  = document.createTextNode('otherText');
        $parentDiv[0].insertBefore(text, $div[0]);
        selectors = generate($div);
        assertSelectors($div, selectors, [GeneratorRules.ruleIDs.BY_ID, GeneratorRules.ruleIDs.BY_TEXT, GeneratorRules.ruleIDs.BY_ANCESTOR_AND_TEXT, GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_AND_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_ATTR_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_TEXT_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        strictEqual(selectors.length, 8, 'amount of generated selectors checked after parent text adding');

        $div.text('');
        selectors = generate($div);
        assertSelectors($div, selectors, [GeneratorRules.ruleIDs.BY_ID, GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_AND_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_ATTR_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_TEXT_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        strictEqual(selectors.length, 6, 'amount of generated selectors checked after text removing');

        $div.attr('id', '');
        selectors = generate($div);
        assertSelectors($div, selectors, [GeneratorRules.ruleIDs.BY_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_AND_ATTR, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_ATTR_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_TEXT_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        strictEqual(selectors.length, 5, 'amount of generated selectors checked after id removing');

        $div.attr('class', '');
        selectors = generate($div);
        assertSelectors($div, selectors, [GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_ATTR_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_ANCESTOR_WITH_TEXT_AND_TAGS_TREE, GeneratorRules.ruleIDs.BY_TAGS_TREE]);
        strictEqual(selectors.length, 3, 'amount of generated selectors checked after class removing');

        startNext();
    });


    module('Regression tests');
    asyncTest('element with unallowed symbols in ID (B239137, T133746)', function () {
        var $div = $('<div></div>').attr('id', '$test:test!a"a#a%a&a\'a(a|a)a*a+a,a.a/a:a;a<a=a>a?a@a[a]a^a`a{a|a}a~a').appendTo($container);
        try {
            var selectors = generate($div);
        }
        catch (e) {
            ok(false, 'selector generating threw error: ' + e.message);
        }
        assertSelectors($div, selectors, [GeneratorRules.ruleIDs.BY_ID, GeneratorRules.ruleIDs.BY_TAGS_TREE]);

        startNext();
    });

    asyncTest('element in iframe on page with cross-domain iframe (B250093)', function () {
        var sameDomainUrl      = '/data/focus_blur_change/test_iframe.html',
            crossDomainUrl     = 'http://platform.twitter.com/widgets/follow_button.html?screen_name=test',
            $iframe            = $('<iframe></iframe>').attr('src', sameDomainUrl).appendTo($container),
            $crossDomainIframe = $('<iframe></iframe>').attr('src', crossDomainUrl).appendTo($container);
        setDoubleTimeout(function () {
            var errorThrown = false;
            try {
                var $iframeBody = $('body', $iframe.contents());
                var selectors   = generate($iframeBody);
                assertSelectors($iframeBody, selectors, [GeneratorRules.ruleIDs.FOR_BODY]);
            }
            catch (e) {
                errorThrown = true;
            }
            ok(!errorThrown, 'check that selector generating for element in iframe on page with cross-domain iframe does not lead to javascript error');
            startNext();
        }, CROSS_DOMAIN_IFRAME_READY_TIMEOUT);
    });
});
