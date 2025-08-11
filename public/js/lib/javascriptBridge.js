define([
    'backbone.marionette',
    'underscore'
], function(Mn, _) {
    'use strict';

    var JavascriptBridge = Mn.Object.extend({
        hostType: null,
        androidHandlers: {},

        initialize: function(options) {
            this._detectHostType();
            console.log('Host type: ' + this.hostType);
            if (this.hostType === null) {
                console.error('Invalid host type');
            }
        },

        registerHandler: function(methodName, methodCallback) {
            if (this.hostType == 'android') {
                this.androidHandlers[methodName] = methodCallback;
            } else if (this.hostType == 'ios') {
				this._iosBridgeCall(function(bridge) {
	        		bridge.registerHandler(methodName, methodCallback);
				});
            }
        },

        call: function(methodName, data, responseCallback) {
            console.log('call :' + methodName);
            if (this.hostType == 'android') {
                var response = androidJavascriptBridge._callAndroidHandler(methodName, JSON.stringify(data));
                if (responseCallback) {
                    responseCallback(JSON.parse(response));
                }
            } else if (this.hostType == 'ios') {
				this._iosBridgeCall(function(bridge) {
	        		bridge.callHandler(methodName, data, responseCallback);
				});
            }
        },

        _callAndroidHandler: function(method, data, responseMethod) {
            if (!(method in this.androidHandlers)) {
                console.error('Invalid handler:' + method);
            }

            this.androidHandlers[method](JSON.parse(data), _.bind(function(result) {
                androidJavascriptBridge._callAndroidResponse(responseMethod, result);
            }, this));
        },

        _iosBridgeCall: function (callback) {
            if (window.WebViewJavascriptBridge) { return callback(WebViewJavascriptBridge); }
            if (window.WVJBCallbacks) { return window.WVJBCallbacks.push(callback); }
            window.WVJBCallbacks = [callback];
            var WVJBIframe = document.createElement('iframe');
            WVJBIframe.style.display = 'none';
            WVJBIframe.src = 'https://__bridge_loaded__';
            document.documentElement.appendChild(WVJBIframe);
            setTimeout(function() { document.documentElement.removeChild(WVJBIframe) }, 0)
        },

        _detectHostType: function() {
            var standalone = window.navigator.standalone;
            var userAgent = window.navigator.userAgent.toLowerCase();
            var safari = /safari/.test(userAgent);
            var ios = /iphone|ipod|ipad/.test(userAgent);

            if (ios && !standalone && !safari) {
                this.hostType = 'ios';
                return;
            }

            var android = /veritranandroid/.test(userAgent);
            if (android) {
                this.hostType = 'android';
                return;
            }
            this.hostType = 'browser';
        }
    });

    return JavascriptBridge;
});
