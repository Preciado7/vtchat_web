define([
    'vendor/cometd-8-full'  // Use the full CometD 8.0.x implementation
], function(CometD8) {
    'use strict';

    // CometD 8.0.x AMD wrapper with full implementation
    // This provides the complete CometD 8.0.x API with proper registerTransports support
    
    // Return the full CometD8 module which already has all the required components
    return CometD8;
});