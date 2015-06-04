var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$;

test('JSON.isSerializable', function () {
    var $testDiv = $('#testDiv');

    var obj1 = {
        prop1: 'someStr',
        prop2: {
            jqueryObj: $testDiv
        }
    };

    var obj2 = {
        prop1: 'someStr',
        prop2: [ $testDiv[0], '123']
    };

    var obj3 = {
        prop1: function () {
            alert('1')
        }
    };

    var obj4 = {
        prop1: 1,
        prop2: {
            prop3: [
                new Date(),
                false
            ]
        }
    };

    var JSON = HammerheadClient.get('JSON');

    ok(!JSON.isSerializable(obj1));
    ok(!JSON.isSerializable(obj2));
    ok(!JSON.isSerializable(obj3));
    ok(JSON.isSerializable(obj4));
});
