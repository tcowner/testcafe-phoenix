var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    APIv2 = TestCafeClient.get('TestRunner.APIv2');

Hammerhead.init();

var select = APIv2.create(Hammerhead.SandboxedJQuery).select;

function jqCompare($a, $b) {
    return $a.length === $b.length && $a.length === $a.filter($b).length;
}

function sEq($selection, $jqAlternative) {
    ok(jqCompare($selection, $jqAlternative), 'Selector result');
    ok(jqCompare($selection[APIv2.REPRODUCE_SELECTION_CHAIN_FUNC_KEY](), $jqAlternative), 'Selecting function result');
}

module('Select');

test('select.by.id(String)', function () {
    sEq(select.by.id('player'), $('#player'));
    sEq(select.by.id('HCCInteractive'), $('#HCCInteractive'));
});

test('select.by.id(RegExp)', function () {
    sEq(select.by.id(/player\d*/), $('#player').add('#player2'));
    sEq(select.by.id(/H(B|C)CInteractive/), $('#HCCInteractive').add('#HBCInteractive'));
});

test('select.by.id([some_clutter])', function () {
    sEq(select.by.id(123), $(''));
    sEq(select.by.id(false), $(''));
});

test('select.by.tag(String)', function () {
    sEq(select.by.tag('div'), $('div'));
    sEq(select.by.tag('h1'), $('h1'));
});

test('select.by.class(String)', function () {
    sEq(select.by.class('item'), $('.item'));
    sEq(select.by.class('content'), $('.content'));
});

test('select.by.text(String)', function () {
    sEq(select.by.text('TestCafe on our server so you can try'), $('.demo-text'));
    sEq(
        select.by.text('Learn Mo'),
        $('a[href$="#framework"]').add('a[href$="#api"]').add('a[href$="#recorder"]')
    );
});

test('select.by.text(RegExp)', function () {
    sEq(select.by.text(/Run tests (o|i)n/), $('#yo1').add('#yo2').add('#yo3'));
    sEq(select.by.text(/in any browser/i), $('#pow1').add('#pow2'));
});

test('select.by.text([some_clutter])', function () {
    sEq(select.by.text(123), $(''));
    sEq(select.by.text(false), $(''));
});

test('select.by.attr(String)', function () {
    sEq(select.by.attr('data-tooltip-title'), $('.Icon'));
    sEq(select.by.attr('href'), $('[href]'));
});

test('select.by.attr(String, String)', function () {
    sEq(select.by.attr('class', 'Platforms'), $('.Platforms'));
    sEq(select.by.attr('yo', '_self'), $('#support-link'));
});

test('select.by.attr(String, RegExp)', function () {
    sEq(select.by.attr('id', /player\d*/), $('#player').add('#player2'));
    sEq(select.by.attr('data-tooltip-title', /TestCafe Supports\s+/), $('[data-tooltip-text="browser"]'));
});

test('select.by.attr([some_clutter], [some_clutter])', function () {
    sEq(select.by.attr('id', 123), $('[id]'));
    sEq(select.by.attr(false, /TestCafe Supports\s+/), $(''));
    sEq(select.by.attr(123, null), $(''));
});

test('select.by.name(String)', function () {
    sEq(select.by.name('boop'), $('[name=boop]'));
    sEq(select.by.name('beep'), $('[name=beep]'));
});

test('select.by.name(RegExp)', function () {
    sEq(select.by.name(/.+/), $('[name=boop]').add('[name=beep]').add('[name=video]'));
    sEq(select.by.name(/b(e|o)+p/), $('[name=boop]').add('[name=beep]'));
});

test('select.by.name([some_clutter])', function () {
    sEq(select.by.name(false), $(''));
    sEq(select.by.name(null), $(''));
});

test('select.$(selector)', function () {
    sEq(select.$('#player2'), $('#player2'));
    sEq(select.$('.Icon'), $('.Icon'));
    sEq(select.$($('.Icon')[0]), $('.Icon').eq(0));
});

test('select.by.{selector}.and.{selector}', function () {
    sEq(select.by.class('Icon').and.attr('data-tooltip-title', 'TestCafe Supports FireFox'), $('#ff'));

    var selector = select.by.tag('div').and.class('Icon');

    sEq(selector.and.id('ff'), $('#ff'));
    sEq(selector.and.attr('data-tooltip-title', 'TestCafe Supports Chrome'), $('#chrome'));
});


module('Select in parent');

test('select.by.{selector}.in.with.{selector}', function () {
    sEq(select.by.text(/testing/i).in.with.id('rrrrgh'), $('#header2'));
    sEq(select.by.class('button').in.with.class('buy-now'), $('.buy-now > .content > .button'));
});

test('select.by.{selector}.in.with.{selector}.and.{selector}', function () {
    sEq(
        select.by.tag('img').in.with.class('Icon').and.attr('data-tooltip-title', 'TestCafe Supports Opera'),
        $('[alt="Opera"]')
    );

    sEq(
        select.by.tag('a').in.with.class('span7').and.id('rrrrgh').in.with.class('index').and.tag('div'),
        $('a[href$=#framework]')
    );
});

test('long chains', function () {
    sEq(
        select.by.attr('title', 'Overview').in.with.class('active').in.with.tag('div').in.with.class('header'),
        $('#overview')
    );

    sEq(
        select.by.text('DevExpress').in.with.class('row').in.with.class('bottom-box'),
        $('.all-trademarks')
    )
});

test('reusing chain parts', function () {
    var selector = select.by.tag('a').in.with.class('active').in.with.class('menu');

    sEq(selector.in.with.class('footer'), $('#overview1'));
    sEq(selector.in.with.class('header'), $('#overview'));
});

//TODO
/*
module('Indexing');

test('select.first.by.{selector}', function () {
    sEq(select.first.by.text('Overview'), $('#overview'));
});*/
