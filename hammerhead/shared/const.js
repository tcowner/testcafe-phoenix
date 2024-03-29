(function () {
    var Const = {};

    Const.DOM_SANDBOX_OVERRIDE_DOM_METHOD_NAME = 'tc_odm_e01a2ff5';
    Const.DOM_SANDBOX_PROCESSED_CONTEXT = 'tc-spc-c1208da2';
    Const.DOM_SANDBOX_STORED_ATTR_POSTFIX = '_e01a2f_stored';
    Const.EVENT_SANDBOX_WHICH_PROPERTY_WRAPPER = 'tc-e01a2f-which';

    Const.IS_STYLESHEET_PROCESSED_RULE = '.style-processed-c1208da2 {}';

    Const.UPLOAD_SANDBOX_HIDDEN_INPUT_NAME = 'upload-89fc3-info';

    Const.TEST_CAFE_HOVER_PSEUDO_CLASS_ATTR = "data-1b082a6cec-hover";

    Const.XHR_CORS_SUPPORTED_FLAG = 0x10;
    Const.XHR_REQUEST_MARKER_HEADER = 'x-tc-xm-cd46977f';
    Const.XHR_WITH_CREDENTIALS_FLAG = 0x01;

    Const.PROPERTY_PREFIX = "tc-1b082a6cec-51966-";
    Const.TEST_CAFE_UI_CLASSNAME_POSTFIX = '-TC2b9a6d';
    Const.TEST_CAFE_SCRIPT_CLASSNAME = 'script' + Const.TEST_CAFE_UI_CLASSNAME_POSTFIX;
    Const.TEST_CAFE_UI_STYLESHEET_CLASSNAME = 'ui-stylesheet';
    Const.TEST_CAFE_UI_STYLESHEET_FULL_CLASSNAME = Const.TEST_CAFE_UI_STYLESHEET_CLASSNAME + Const.TEST_CAFE_UI_CLASSNAME_POSTFIX;

    if (typeof module !== 'undefined' && module.exports)
        module.exports = Const;
    else {
        HammerheadClient.define('Shared.Const', function () {
            this.exports = Const;
        });
    }
})();