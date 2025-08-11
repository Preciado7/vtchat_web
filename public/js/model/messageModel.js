define(['backbone'], function(Bb) {
    'use strict';

    var MessageModel = Bb.Model.extend({
        defaults: {
            text: null,
            date: null,
            isMine: null
        }
    });

    return MessageModel;
});
