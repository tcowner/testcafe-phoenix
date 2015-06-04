var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Util = Hammerhead.Util;

test('B252941 - TestCafe - act.click throws an error in FF when click on <object> tag', function () {
    var $el = $('<object></object>').appendTo('body');

    ok(Util.isDomElement($el[0]));

    $el.remove();
});
