var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$;

Hammerhead.init();

var ProgressPanel = TestCafeClient.get('UI.ProgressPanel');

$(document).ready(function () {
    var curValue = 50,
        $value = $('<span>50</span>').text(curValue).css('margin', '0 20px').appendTo('body'),
        pp = new ProgressPanel('Waiting for the target element of the next action to appear', curValue);

    $('<input type="button" value="close"/>').css('margin', '0 20px').click(function () {
        pp.close();
    }).appendTo('body');

    function setNextValue() {
        curValue += 5;

        if (curValue > 110)
            curValue = -10;

        $value.text(curValue);
        pp.setValue(curValue);
    }

    window.setInterval(setNextValue, 300);
});