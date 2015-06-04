var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    EventSimulator = Hammerhead.EventSandbox.Simulator,
    ElementPicker = TestCafeClient.get('Recorder.ElementPicker'),
    JavascriptExecutor = TestCafeClient.get('Base.JavascriptExecutor');

Hammerhead.init();

$(document).ready(function () {
    asyncTest('pick element', function () {
        var $input = $('<input />').appendTo('body'),
            input = $input[0],

            hoveredElement = null,
            pickedElement = null,
            inputMouseEventRaised = false;

        function onHover(e) {
            hoveredElement = e.element;
        }

        function onPick(selectors) {
            pickedElement = JavascriptExecutor.parseSelectorSync(selectors[0].selector).$elements[0];
        }

        function onMouseEvent() {
            inputMouseEventRaised = true;
        }

        ElementPicker.on(ElementPicker.ELEMENT_HOVERED_EVENT, onHover);
        $input.on('mousedown mouseup click', onMouseEvent);

        ElementPicker.start(onPick);

        EventSimulator.mousemove(input);
        equal(hoveredElement, input);

        EventSimulator.mousedown(input);
        EventSimulator.mouseup(input);
        EventSimulator.click(input);
        equal(pickedElement, input);
        ok(!inputMouseEventRaised);

        hoveredElement = null;
        pickedElement = null;

        ElementPicker.stop();

        EventSimulator.mousemove(input);
        equal(hoveredElement, null);

        EventSimulator.mousedown(input);
        EventSimulator.mouseup(input);
        EventSimulator.click(input);
        equal(pickedElement, null);
        ok(inputMouseEventRaised);

        ElementPicker.off(ElementPicker.ELEMENT_HOVERED_EVENT, onHover);
        ElementPicker.off(ElementPicker.ELEMENT_PICKED_EVENT, onPick);

        start();
    });
});
