define(['backbone', 'model/messageModel'], function(Bb, MessageModel) {
    'use strict';

    var MessageCollection = Bb.Collection.extend({
        model: MessageModel,
        comparator: 'id'
    });

    return MessageCollection;
});
