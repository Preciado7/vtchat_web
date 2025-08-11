requirejs.config({
    baseUrl: 'js',
    paths: {
        'jquery': 'vendor/jquery.min',
        'underscore': 'vendor/lodash',
        'backbone': 'vendor/backbone',
        'backbone.marionette': 'vendor/backbone.marionette',
        'backbone.radio': 'vendor/backbone.radio',
        'backbone-nested-models': 'vendor/backbone-nested-models',
        'handlebars': 'vendor/handlebars.runtime',
        'es6': 'es6-module-loader',
        'cometd': 'vendor/cometd-amd-wrapper'
    },
    shim: {
        'underscore': {
            exports: '_'
        },
        'backbone': {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        },
        'backbone.marionette': {
            deps: ['backbone'],
            exports: 'Marionette'
        },
        'backbone.radio': {
            deps: ['backbone'],
            exports: 'Backbone.Radio'
        },
        'backbone-nested-models': {
            deps: ['backbone'],
            exports: 'Backbone'
        }
    }
});

// Declare globals
var vtChatApp;
var jsBridge;

require(['app', 'jquery', 'lib/javascriptBridge', 'backbone-nested-models'], function(app, $, JavascriptBridge) {
    'use strict';

    vtChatApp = app;
    jsBridge = new JavascriptBridge();

    app.start();
});
