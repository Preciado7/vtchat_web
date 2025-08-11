/**
 * Sinon.js AMD wrapper for legacy RequireJS applications
 * This is a simplified version that provides the core mocking functionality needed
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node.js
        module.exports = factory();
    } else {
        // Browser globals
        root.sinon = factory();
    }
}(this, function () {
    'use strict';

    // Simplified Sinon.js implementation for basic mocking needs
    var sinon = {};

    // Array utilities
    function slice(arr, from, to) {
        return Array.prototype.slice.call(arr, from, to);
    }

    function forEach(arr, fn) {
        for (var i = 0; i < arr.length; i++) {
            fn(arr[i], i);
        }
    }

    // Object utilities
    function extend(target, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
        return target;
    }

    // Basic spy implementation
    function createSpy(fn) {
        var spy = function() {
            spy.callCount++;
            spy.calls.push({
                args: slice(arguments),
                thisValue: this
            });
            if (fn) {
                return fn.apply(this, arguments);
            }
        };
        
        spy.callCount = 0;
        spy.calls = [];
        spy.reset = function() {
            spy.callCount = 0;
            spy.calls = [];
        };
        
        return spy;
    }

    // Fake XMLHttpRequest implementation
    function FakeXMLHttpRequest() {
        this.readyState = 0;
        this.responseText = '';
        this.responseXML = null;
        this.status = 0;
        this.statusText = '';
        this.onreadystatechange = null;
        this.onload = null;
        this.onerror = null;
        this.ontimeout = null;
        this.onabort = null;
        this.timeout = 0;
        this.withCredentials = false;
        this.upload = {};
        this.requestHeaders = {};
        this.responseHeaders = {};
        this.method = null;
        this.url = null;
        this.async = true;
        this.username = null;
        this.password = null;
        this.requestBody = null;
        this.errorFlag = false;
        this.sendFlag = false;
        this.aborted = false;
        
        // Store reference for server to access
        FakeXMLHttpRequest.requests = FakeXMLHttpRequest.requests || [];
        FakeXMLHttpRequest.requests.push(this);
    }

    FakeXMLHttpRequest.prototype = {
        open: function(method, url, async, username, password) {
            this.method = method;
            this.url = url;
            this.async = async !== false;
            this.username = username;
            this.password = password;
            this.requestHeaders = {};
            this.sendFlag = false;
            this.readyState = 1;
            this.triggerReadyStateChange();
        },

        setRequestHeader: function(header, value) {
            this.requestHeaders[header] = value;
        },

        send: function(data) {
            this.requestBody = data;
            this.sendFlag = true;
            this.errorFlag = false;
            this.readyState = 2;
            this.triggerReadyStateChange();
        },

        abort: function() {
            this.aborted = true;
            this.readyState = 4;
            this.triggerReadyStateChange();
        },

        getResponseHeader: function(header) {
            return this.responseHeaders[header] || null;
        },

        getAllResponseHeaders: function() {
            var headers = '';
            for (var header in this.responseHeaders) {
                if (this.responseHeaders.hasOwnProperty(header)) {
                    headers += header + ': ' + this.responseHeaders[header] + '\r\n';
                }
            }
            return headers;
        },

        triggerReadyStateChange: function() {
            if (this.onreadystatechange) {
                this.onreadystatechange();
            }
        },

        respond: function(status, headers, body) {
            this.status = status;
            this.statusText = this.getStatusText(status);
            this.responseHeaders = headers || {};
            this.responseText = body || '';
            this.readyState = 4;
            this.triggerReadyStateChange();
            if (this.onload) {
                this.onload();
            }
        },

        getStatusText: function(status) {
            var statusTexts = {
                200: 'OK',
                201: 'Created',
                204: 'No Content',
                400: 'Bad Request',
                401: 'Unauthorized',
                403: 'Forbidden',
                404: 'Not Found',
                500: 'Internal Server Error',
                503: 'Service Unavailable'
            };
            return statusTexts[status] || '';
        }
    };

    // Fake Server implementation
    function FakeServer() {
        this.requests = [];
        this.responses = [];
        this.autoRespond = false;
        this.autoRespondAfter = 0;
        this.fakeHTTPMethods = true;
        this.xhr = null;
        this.respondImmediately = false;
    }

    FakeServer.prototype = {
        respondWith: function(method, url, response) {
            var urlPattern = url;
            if (typeof url === 'string') {
                urlPattern = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            }
            
            this.responses.push({
                method: method,
                url: urlPattern,
                response: response
            });
        },

        restore: function() {
            if (this.xhr) {
                window.XMLHttpRequest = this.xhr;
                this.xhr = null;
            }
        },

        processRequest: function(xhr) {
            var self = this;
            
            // Find matching response
            var matchingResponse = null;
            for (var i = 0; i < this.responses.length; i++) {
                var response = this.responses[i];
                var methodMatch = response.method === xhr.method || response.method === 'ANY';
                var urlMatch = response.url.test ? response.url.test(xhr.url) : response.url === xhr.url;
                
                if (methodMatch && urlMatch) {
                    matchingResponse = response;
                    break;
                }
            }
            
            if (matchingResponse) {
                var responseHandler = matchingResponse.response;
                
                var executeResponse = function() {
                    if (typeof responseHandler === 'function') {
                        responseHandler.call(null, xhr);
                    } else if (Array.isArray(responseHandler)) {
                        var status = responseHandler[0];
                        var headers = responseHandler[1] || {};
                        var body = responseHandler[2] || '';
                        xhr.respond(status, headers, body);
                    }
                };
                
                if (this.autoRespond) {
                    if (this.autoRespondAfter > 0) {
                        setTimeout(executeResponse, this.autoRespondAfter);
                    } else {
                        executeResponse();
                    }
                }
            }
        }
    };

    // Create fake server factory
    sinon.createFakeServer = function() {
        var server = new FakeServer();
        
        // Store original XMLHttpRequest
        server.xhr = window.XMLHttpRequest;
        
        // Replace with fake implementation
        window.XMLHttpRequest = function() {
            var xhr = new FakeXMLHttpRequest();
            server.requests.push(xhr);
            
            // Override send to trigger server processing
            var originalSend = xhr.send;
            xhr.send = function(data) {
                originalSend.call(xhr, data);
                server.processRequest(xhr);
            };
            
            return xhr;
        };
        
        // Copy static properties
        for (var prop in server.xhr) {
            if (server.xhr.hasOwnProperty(prop)) {
                window.XMLHttpRequest[prop] = server.xhr[prop];
            }
        }
        
        return server;
    };

    // jQuery/Zepto AJAX integration
    sinon.useFakeXMLHttpRequest = function() {
        var original = window.XMLHttpRequest;
        window.XMLHttpRequest = FakeXMLHttpRequest;
        
        return {
            restore: function() {
                window.XMLHttpRequest = original;
            }
        };
    };

    // Spy functionality
    sinon.spy = createSpy;

    // Stub functionality
    sinon.stub = function(obj, method, fn) {
        if (arguments.length === 0) {
            return createSpy();
        }
        
        if (arguments.length === 1) {
            return createSpy(obj);
        }
        
        var original = obj[method];
        var stub = createSpy(fn);
        
        stub.restore = function() {
            obj[method] = original;
        };
        
        obj[method] = stub;
        return stub;
    };

    // Mock functionality
    sinon.mock = function(obj) {
        return {
            expects: function(method) {
                return {
                    returns: function(value) {
                        obj[method] = function() {
                            return value;
                        };
                        return this;
                    },
                    throws: function(error) {
                        obj[method] = function() {
                            throw error;
                        };
                        return this;
                    }
                };
            },
            restore: function() {
                // Restore would need to track original methods
            }
        };
    };

    // Sandbox functionality
    sinon.createSandbox = function() {
        return {
            spy: sinon.spy,
            stub: sinon.stub,
            mock: sinon.mock,
            useFakeXMLHttpRequest: sinon.useFakeXMLHttpRequest,
            restore: function() {
                // Restore all fakes created in this sandbox
            }
        };
    };

    // Fake timers (simplified)
    sinon.useFakeTimers = function() {
        var originalSetTimeout = window.setTimeout;
        var originalSetInterval = window.setInterval;
        var originalClearTimeout = window.clearTimeout;
        var originalClearInterval = window.clearInterval;
        
        var timers = [];
        var now = Date.now();
        
        window.setTimeout = function(fn, delay) {
            var id = timers.length;
            timers.push({
                id: id,
                fn: fn,
                delay: delay,
                type: 'timeout'
            });
            return id;
        };
        
        window.setInterval = function(fn, delay) {
            var id = timers.length;
            timers.push({
                id: id,
                fn: fn,
                delay: delay,
                type: 'interval'
            });
            return id;
        };
        
        window.clearTimeout = function(id) {
            if (timers[id]) {
                timers[id] = null;
            }
        };
        
        window.clearInterval = function(id) {
            if (timers[id]) {
                timers[id] = null;
            }
        };
        
        return {
            tick: function(ms) {
                now += ms;
                // Execute timers (simplified)
                for (var i = 0; i < timers.length; i++) {
                    var timer = timers[i];
                    if (timer && timer.delay <= ms) {
                        timer.fn();
                        if (timer.type === 'timeout') {
                            timers[i] = null;
                        }
                    }
                }
            },
            restore: function() {
                window.setTimeout = originalSetTimeout;
                window.setInterval = originalSetInterval;
                window.clearTimeout = originalClearTimeout;
                window.clearInterval = originalClearInterval;
            }
        };
    };

    // Version info
    sinon.version = '9.2.4-custom';

    return sinon;
}));