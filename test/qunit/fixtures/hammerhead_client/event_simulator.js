var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Util = Hammerhead.Util,
    EventSimulator = Hammerhead.EventSandbox.Simulator;

Hammerhead.init();

var $domElement,
    domElement,
    raised;

var lastTouchIdentifier = null;

QUnit.testStart = function () {
    $domElement = $('<input type="text">').attr('id', 'domElement').appendTo('body');
    domElement = $domElement[0];
    raised = false;
    lastTouchIdentifier = null;
};

QUnit.testDone = function () {
    $domElement.remove();
};

var bindMouseEvent = function (eventType, btn) {
    var button = btn === undefined ? 0 : btn;
    domElement['on' + eventType] = function (e) {
        var ev = e || window.event;
        if (ev.button === button)
            raised = true;
    }
};

var bindKeyEvent = function (eventType, keyCode) {
    domElement['on' + eventType] = function (e) {
        var ev = e || window.event;
        if (ev.keyCode === keyCode)
            raised = true;
    }
};

test('Mouse left button click', function () {
    bindMouseEvent('click', Util.BUTTON.LEFT);
    EventSimulator.click(domElement);
    equal(raised, true);
});

test('Mouse double click', function () {
    bindMouseEvent('dblclick', Util.BUTTON.LEFT);
    EventSimulator.dblclick(domElement);
    equal(raised, true);
});

test('Mouse right click', function () {
    bindMouseEvent('click', Util.BUTTON.RIGHT);
    bindMouseEvent('mousedown', Util.BUTTON.RIGHT);
    bindMouseEvent('mouseup', Util.BUTTON.RIGHT);
    EventSimulator.rightclick(domElement);
    equal(raised, true);
});

test('Mouse down', function () {
    bindMouseEvent('mousedown', Util.BUTTON.LEFT);
    EventSimulator.mousedown(domElement);
    equal(raised, true);
});

test('Mouse up', function () {
    bindMouseEvent('mouseup', Util.BUTTON.LEFT);
    EventSimulator.mouseup(domElement);
    equal(raised, true);
});

test('Mouse down right', function () {
    bindMouseEvent('mousedown', Util.BUTTON.RIGHT);
    EventSimulator.mousedown(domElement, { button: Util.BUTTON.RIGHT });
    equal(raised, true);
});

test('Mouse up  right', function () {
    bindMouseEvent('mouseup', Util.BUTTON.RIGHT);
    EventSimulator.mouseup(domElement, { button: Util.BUTTON.RIGHT });
    equal(raised, true);
});

test('Context menu', function () {
    bindMouseEvent('contextmenu', Util.BUTTON.RIGHT);
    EventSimulator.contextmenu(domElement, { button: Util.BUTTON.RIGHT });
    equal(raised, true);
});

test('Mouse over', function () {
    bindMouseEvent('mouseover');
    EventSimulator.mouseover(domElement);
    equal(raised, true);
});

test('Mouse move', function () {
    bindMouseEvent('mousemove');
    EventSimulator.mousemove(domElement);
    equal(raised, true);
});

test('Mouse out', function () {
    bindMouseEvent('mouseout');
    EventSimulator.mouseout(domElement);
    equal(raised, true);
});

test('Key press', function () {
    bindKeyEvent('keypress', 13);
    EventSimulator.keypress(domElement, { keyCode: 13 });
    equal(raised, true);
});

test('Key up', function () {
    bindKeyEvent('keyup', 13);
    EventSimulator.keyup(domElement, { keyCode: 13 });
    equal(raised, true);
});

test('Key down', function () {
    bindKeyEvent('keydown', 13);
    EventSimulator.keydown(domElement, { keyCode: 13 });
    equal(raised, true);
});

test('Event with options (ctrl, alt, shift, meta)', function () {
    domElement['onclick'] = function (e) {
        var ev = e || window.event;
        if (ev.ctrlKey && ev.altKey && ev.shiftKey && ev.metaKey)
            raised = true;
    };
    EventSimulator.click(domElement, { ctrl: true, alt: true, shift: true, meta: true });
    equal(raised, true);
});

test('Event with coords (clientX, clientY)', function () {
    var clientX = 10,
        clientY = 10;
    domElement['onmousedown'] = function (e) {
        var ev = e || window.event;
        if (ev.clientX == clientX && ev.clientY == clientY && ev.button == Util.BUTTON.LEFT)
            raised = true;
    };
    EventSimulator.mousedown(domElement, { clientX: clientX, clientY: clientY });
    equal(raised, true);
});

test('Blur', function () {
    var blured = false;
    domElement['onblur'] = function (e) {
        blured = true;
    };
    EventSimulator.blur(domElement);
    equal(blured, true);
});

if (!Util.isMozilla) {
    test('window.event is not null', function () {
        var ev = null;
        domElement['onclick'] = function (e) {
            ev = window.event.type;
        };
        EventSimulator.click(domElement);
        equal(ev, 'click');
    });
}

// NOTE: for touch devices
if (!!('ontouchstart' in window)) {
    var bindTouchEvent = function (eventType) {
        domElement['on' + eventType] = function (e) {
            var touchIdentifier = e.changedTouches[0].identifier;
            raised = true;
            lastTouchIdentifier = touchIdentifier;
        }
    };

    test('T112153 - Click (Touch) events are not raised when using a combination of TestCafé 14.1.1 + KendoUI Mobile + iOS', function () {
        var savedIdentifier = lastTouchIdentifier;

        bindTouchEvent('touchstart');
        bindTouchEvent('touchend');
        bindTouchEvent('touchmove');

        EventSimulator.touchstart(domElement);
        equal(raised, true);
        raised = false;
        notEqual(lastTouchIdentifier, savedIdentifier);
        savedIdentifier = lastTouchIdentifier;

        EventSimulator.touchmove(domElement);
        equal(raised, true);
        raised = false;
        equal(lastTouchIdentifier, savedIdentifier);

        EventSimulator.touchend(domElement);
        equal(raised, true);
        raised = false;
        equal(lastTouchIdentifier, savedIdentifier);

        EventSimulator.touchstart(domElement);
        notEqual(lastTouchIdentifier, savedIdentifier);
    });
}

if (Util.isIE) {
    if (!Util.isIE11) {
        test('Preventing via the window.event property', function () {
            var $checkBox = $('<input type="checkbox">')
                .click(function () {
                    window.event.returnValue = false;
                })
                .appendTo('body');

            var initChecked = $checkBox[0].checked;

            EventSimulator.click($checkBox[0]);
            strictEqual(initChecked, $checkBox[0].checked);

            $checkBox.remove();
        });
    }

    test('cancel bubble via the window.event property', function () {
        var $checkBox = $('<input type="checkbox" />')
                .click(function () {
                    window.event.cancelBubble = true;
                })
                .appendTo('body'),

            documentClickRaised = false;

        document.addEventListener('click', function () {
            documentClickRaised = true;
        });

        EventSimulator.click($checkBox[0]);

        ok(!documentClickRaised);

        $checkBox.remove();
    });
}

module('Regression tests');

if (Util.isIE) {
    if (!Util.isIE11) {
        test('B237144 - IE9, IE10 - Unexpected postback occurs when call DoClick() method of the ASPxButton client instance with disabled AutoPostBack property', function () {
            var $textInput = $('<input type="text">').appendTo('body'),

                $checkBox1 = $('<input type="checkbox">')
                    .attr('id', 'cb1')
                    .appendTo('body'),

                $checkBox2 = $('<input type="checkbox">')
                    .attr('id', 'cb2')
                    .appendTo('body');

            $checkBox1[0].onclick = function () {
                $checkBox2[0].click();
                window.event.returnValue = false;
            };

            $checkBox2[0].addEventListener('click', function () {
                $checkBox2[0].focus();
                window.event.returnValue = false;
            });

            var initChecked1 = $checkBox1[0].checked,
                initChecked2 = $checkBox2[0].checked;

            EventSimulator.click($checkBox1[0]);

            strictEqual(initChecked1, $checkBox1[0].checked);
            strictEqual(initChecked2, $checkBox2[0].checked);

            $checkBox1.remove();
            $checkBox2.remove();
            $textInput.remove();
        });
    }

    test('B237405 - window.event contains toElement and fromElement properties for mouseout and mouseover events', function () {
        var mouseoutChecked = false,
            mouseoverChecked = false,
            onmouseout = function () {
                mouseoutChecked = window.event && window.event.fromElement === $divFrom[0] && window.event.toElement === $divTo[0];
            },
            onmouseover = function () {
                mouseoverChecked = window.event && window.event.fromElement === $divFrom[0] && window.event.toElement === $divTo[0];
            },
            $divFrom = $('<div>').mouseout(onmouseout).appendTo('body'),
            $divTo = $('<div>').mouseover(onmouseover).appendTo('body');

        EventSimulator.mouseout($divFrom[0], {relatedTarget: $divTo[0]});
        EventSimulator.mouseover($divTo[0], {relatedTarget: $divFrom[0]});
        ok(mouseoutChecked, 'mouseout checked');
        ok(mouseoverChecked, 'mouseover checked');
        $divFrom.remove();
        $divTo.remove();
    });
}

