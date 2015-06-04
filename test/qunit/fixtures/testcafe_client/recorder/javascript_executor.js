var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Settings = HammerheadClient.get('Settings'),
    JavascriptExecutor = TestCafeClient.get('Base.JavascriptExecutor'),
    UrlUtil = HammerheadClient.get('UrlUtil'),
    Util = Hammerhead.Util;

Hammerhead.init();

Settings.RECORDING = true;
$(document).ready(function () {
    $('iframe').eq(0).load(function () {
        var testSelector = function (selector, $expectedElements, expectedLength) {
            var parsedSelector = JavascriptExecutor.parseSelectorSync(selector),
                $elements = parsedSelector.$elements;

            if (!$elements)
                $elements = $();

            strictEqual($elements.length, expectedLength, 'received by getElementsFromSelector() elements length checked');
            strictEqual($expectedElements.length, expectedLength, '$expectedElements parameter length checked');
            if ($expectedElements.length === $elements.length)
                for (var i = 0; i < $elements.length; i++)
                    strictEqual($elements.get(i), $expectedElements.get(i), (i + 1).toString() + ' element equality checked');
        };

        test('jQuery object', function () {
            var divWithId = '$("#divId")';
            testSelector(divWithId, $('div#divId'), 1);

            var divWithNameAndText = "$('div[name=\"divName\"]').add($('div').filter(function () { return $(this).text() === 'divText'; }))";
            testSelector(divWithNameAndText,
                $('div[name="divName"]').add($('div').filter(function () {
                    return $(this).text() === 'divText';
                })),
                2);

            var iframeDivWithId = "$('#divInIFrame', $('iframe[name=\"iframe1\"]').contents())";
            testSelector(iframeDivWithId, $('#divInIFrame', $('iframe[name="iframe1"]').contents()), 1);
        });

        test('css selector', function () {
            var divWithId = '"#divId"';
            testSelector(divWithId, $('div#divId'), 1);

            var divWithName = "'div[name=\"divName\"]'";
            testSelector(divWithName, $('div[name="divName"]'), 1);
        });

        //TODO util.isElementVisible
        test('DOM element', function () {
            var divWithId = "document.getElementById('divId')";
            testSelector(divWithId, $(document.getElementById('divId')), 1);

            var allDivs = "document.getElementsByTagName('div')";
            testSelector(allDivs, $(document.getElementsByTagName('div')), 3);

            var iframeDivWithId = "$('iframe[name=\"iframe1\"]').contents()[0].body.childNodes[0]";
            testSelector(iframeDivWithId, $('#divInIFrame', $('iframe[name="iframe1"]').contents()), 1);
        });

        test('function', function () {
            var divWithId = "(function() { return document.getElementById('divId'); })()";
            testSelector(divWithId, $(document.getElementById('divId')), 1);

            var divWithText = "(function () { var $divs = $('div'); return $divs.not('#divId').not('[name=\"divName\"]'); })()";
            testSelector(divWithText, $('div').filter(function () {
                return this.innerHTML === 'divText';
            }), 1);

            var divWithName = "(function(){ return \"div[name='divName']\"; })()";
            testSelector(divWithName, $('[name="divName"]'), 1);

            var arrayOfDivs = "(function(){ var divArray = []; divArray.push('#divId'); divArray.push($('div:nth(1)')); divArray.push((function(){ return document.getElementsByTagName('div')[2] })()); return divArray; })()";
            testSelector(arrayOfDivs, $('div'), 3);

            var arrayOfDivs2 = "(function(){ var divArray = []; divArray.push((function(){ return ['#divId', $('div:nth(1)')]; })()); divArray.push(document.getElementsByTagName('div')[2]); return divArray; })()";
            testSelector(arrayOfDivs2, $('div'), 3);
        });

        test('array', function () {
            var firstTwoDivs = "[ $('#divId'), $('div:nth(1)') ]";
            testSelector(firstTwoDivs, $('#divId,div:nth(1)'), 2);

            var firstTwoDivs2 = "new Array(document.getElementById('divId'), (function(){ return '[name=\"divName\"]'; })())";
            testSelector(firstTwoDivs2, $('div:nth(0),div:nth(1)'), 2);
        });

        //selector errors
        test('empty selector error', function () {
            var divWithId = '',
                parsedSelector = JavascriptExecutor.parseSelectorSync(divWithId);
            strictEqual(parsedSelector.error, JavascriptExecutor.EMPTY_SELECTOR_ERROR, 'expected error checked');
            strictEqual(parsedSelector.$elements, null, 'received by getElementsFromSelector() elements checked');
        });

        test('invalid elements in jquery object error', function () {
            var selector = '$([2.87, 3.62])',
                parsedSelector = JavascriptExecutor.parseSelectorSync(selector);
            strictEqual(parsedSelector.error, JavascriptExecutor.INVALID_ELEMENTS_IN_JQUERY_OBJECT_ERROR, 'expected error checked');
            strictEqual(parsedSelector.$elements, null, 'received by getElementsFromSelector() elements checked');
        });

        test('invalid elements in array error', function () {
            var selector = '[$("#divId"), 4.12]',
                parsedSelector = JavascriptExecutor.parseSelectorSync(selector);
            strictEqual(parsedSelector.error, JavascriptExecutor.INVALID_ELEMENTS_IN_ARRAY_ERROR, 'expected error checked');
            strictEqual(parsedSelector.$elements, null, 'received by getElementsFromSelector() elements checked');
        });

        test('invalid object type error', function () {
            var selector = 'NaN',
                parsedSelector = JavascriptExecutor.parseSelectorSync(selector);
            strictEqual(parsedSelector.error, JavascriptExecutor.INVALID_OBJECT_ERROR, 'expected error checked');
            strictEqual(parsedSelector.$elements, null, 'received by getElementsFromSelector() elements checked');
        });

        test('element invisible (warning)', function () {
            $('#divId').css('visibility', 'hidden');

            var divWithId = '"#divId"',
                parsedSelector = JavascriptExecutor.parseSelectorSync(divWithId);

            testSelector(divWithId, $('div#divId'), 1);
            strictEqual(parsedSelector.length - parsedSelector.visibleLength, 1, 'received by getElementsFromSelector() invisible count checked');
        });

        test('element selector has javascript error (error)', function () {
            var divWithId = "document.getElementById('divId'",
                parsedSelector = JavascriptExecutor.parseSelectorSync(divWithId);
            ok(parsedSelector.error.length > 0);
            strictEqual(parsedSelector.$elements, null, 'received by getElementsFromSelector() elements checked');
        });

        test('containsExcludeChildren selector with invalid parameter (B237350)', function () {
            var divWithText = '$(":containsExcludeChildren(divText)")bbb',
                parsedSelector = JavascriptExecutor.parseSelectorSync(divWithText);
            ok(!(parsedSelector.$elements && parsedSelector.$elements.length));
        });

        asyncTest('parse selector in cross-domain iFrame', function () {
            var $iframe = $('<iframe>'),
                selector = '$("#testDiv")';

            $iframe[0].src = window.getCrossDomainPageUrl('javascript_executor.html');
            $iframe.appendTo('body');

            $iframe.load(function () {
                JavascriptExecutor.parseSelector(selector, false, function (parsedSelector) {
                    equal(parsedSelector.length, 1);
                    equal(parsedSelector.visibleLength, 1);
                    ok(parsedSelector.iframeContext);
                    ok(!parsedSelector.error);
                    equal(parsedSelector.selector, selector);

                    $iframe.remove();
                    start();
                }, $iframe[0].contentWindow);
            });
        });

        test('parseDomElementsOrJqueryObjectsOnly flag', function () {
            var text = '"#testDiv"',
                parsedSelector = JavascriptExecutor.parseSelectorSync(text, true);
            ok(parsedSelector.length === 0, 'string selector was not parsed');

            text = "[$('#divId')]";
            parsedSelector = JavascriptExecutor.parseSelectorSync(text, true);
            ok(parsedSelector.length === 0, 'array of jQuery objects was not parsed');

            text = "document.getElementById('divId')";
            parsedSelector = JavascriptExecutor.parseSelectorSync(text, true);
            ok(parsedSelector.length, 'expression returning DOM element parsed');

            text = "$('#divId')";
            parsedSelector = JavascriptExecutor.parseSelectorSync(text, true);
            ok(parsedSelector.length, 'jQuery selector parsed');

            text = "document.getElementsByTagName('div')";
            parsedSelector = JavascriptExecutor.parseSelectorSync(text, true);
            ok(parsedSelector.length, 'expression returning DOM elements collection parsed');
        });

        test('Combination of select and option element should be parsed as an one element', function () {
            var $select = $('<select><option>1</option></select>').attr('id', 'testSelect').appendTo('body');

            var parsedSelector = JavascriptExecutor.parseSelectorSync("[$('#testSelect'), $('#testSelect').find('option').eq(0)]");

            equal(parsedSelector.length, 1);

            $select.remove();
        });

        test('passing jQuery function as one of jQuery function parameters', function () {
            //When uncompleted expression like $('selector', $) is being parsed browser must not hang
            var parsedSelector = JavascriptExecutor.parseSelectorSync('$("body", $)');
            strictEqual(parsedSelector.error, JavascriptExecutor.JAVASCRIPT_ERROR_PREFIX + JavascriptExecutor.RECURSIVE_JQUERY_CALLING_ERROR, 'expected error checked');
            strictEqual(parsedSelector.$elements, null, 'received elements checked');

            parsedSelector = JavascriptExecutor.parseSelectorSync('$(jQuery)');
            strictEqual(parsedSelector.error, JavascriptExecutor.JAVASCRIPT_ERROR_PREFIX + JavascriptExecutor.RECURSIVE_JQUERY_CALLING_ERROR, 'expected error checked');
            strictEqual(parsedSelector.$elements, null, 'received elements checked');
        });

        test('TD_14_2 - Wrong window and document elements in assertion dialogs (wrong context)', function () {
            ok(JavascriptExecutor.eval('window === window.top'));
            ok(JavascriptExecutor.eval('document === window.top.document'));
            ok(!JavascriptExecutor.eval('alert()'));  //if this is failed test will be hung
            ok(!JavascriptExecutor.eval('window.alert()'));   //if this is failed test will be hung
            ok(!JavascriptExecutor.eval('document.location.href = "http://localhost:1335"'));   //if this is failed test will be hung
        });

        test('TD_14_2 - Assertion params don\'t wraps', function () {
            var originLink = 'http://example.com/',
                id = 'testLink',
                $a = $('<a></a>').attr('href', originLink).attr('id', id).appendTo('body');

            strictEqual(JavascriptExecutor.eval('document.getElementById("' + id + '").href'), originLink);
            $a.remove();
        });

        asyncTest('window.alert is overridden after exception during js eval', function () {
            expect(4);

            var savedAlert = window.alert,
                savedPrompt = window.prompt,
                savedConfirm = window.confirm;

            JavascriptExecutor.eval('a', function (err) {
                ok(err);
                strictEqual(window.alert, savedAlert);
                strictEqual(window.prompt, savedPrompt);
                strictEqual(window.confirm, savedConfirm);
                start();
            });
        });
    });
});
