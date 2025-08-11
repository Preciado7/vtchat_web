define(['backbone', 'backbone.marionette', 'views/messageItemView'], function(Bb, Mn, MessageItemView) {
    'use strict';

    var MessageCollectionView = Mn.CollectionView.extend({
        tagName: 'ul',
        childView: MessageItemView,
        className: 'messages',

        initialize: function() {
            $(window).on('resize.vtchat', _.bind(this.onWindowResize, this));
        },

        onWindowResize: function() {
            window.scrollTo(0,document.body.scrollHeight);
        },

        onAddChild: function() {
            window.scrollTo(0,document.body.scrollHeight);
        },

        onDomRefresh: function() {
            window.scrollTo(0,document.body.scrollHeight);
        }
    });

    return MessageCollectionView;
});
