define(['backbone', 'backbone.marionette'], function(Bb, Mn) {
    'use strict';

    var MessageItemView = Mn.View.extend({
        tagName: 'li',
        template: Handlebars.templates.message,

        onRender: function() {
            var isMine = this.model.get('isMine');
            console.log('[MessageItemView] Rendering message:', this.model.get('text'));
            console.log('[MessageItemView] Message isMine:', isMine);
            console.log('[MessageItemView] Message model:', this.model.toJSON());
            
            if (isMine) {
                console.log('[MessageItemView] Adding "right" class (user message)');
                this.$el.addClass('right');
            } else {
                console.log('[MessageItemView] Adding "left" class (agent message)');
                this.$el.addClass('left');
            }
            
            console.log('[MessageItemView] Final element classes:', this.$el.attr('class'));
        }
    });

    return MessageItemView;
});
