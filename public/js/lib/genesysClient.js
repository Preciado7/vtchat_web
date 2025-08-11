define([
    'backbone.marionette',
    'jquery',
    'underscore'
], function(Mn, $, _) {
    'use strict';

    var GenesysClient = Mn.Object.extend({
        serverUrl: null,
        verbose: false,
        endpoints: {
            requestChat: '/1/service/request-chat',
            createChatInteraction: '/1/service/{serviceId}/ixn/chat',
            refresh: '/1/service/{serviceId}/ixn/chat/refresh',
            disconnect: '/1/service/{serviceId}/ixn/chat/disconnect',
            fileUpload: '/genesys/2/chat-ntf'  // API v2 file management
        },

        initialize: function(options) {
            this.serverUrl = options.serverUrl;
            this.verbose = options.verbose;
            this.endpoints = _.extend(this.endpoints, options.endpoints);
        },

        requestChat: function(params, onSuccess, onError) {
            var data = {
                _customer_number: params.customerNumber,
                usr_customer_id: params.customerId,
                usr_customer_segment: params.customerSegment,
                usr_customer_number: params.customerNumber,
                usr_contact_reason: params.contactReason,
                usr_session_id: params.sessionId,
                usr_service_id: params.requestChatServiceId,
                usr_channel_id: params.genesysChannelId,
                usr_customer_name: params.customerName,
                usr_contact_email: params.contactEmail,
                usr_mlsd_status: params.mlsdStatus,
                usr_mlsd_account: params.mlsdAccount,
                usr_mlsd_nip: params.mlsdNip,
                usr_info_product_type: params.infoProductType,
                usr_clar_reason: params.clarReason,
                usr_clar_account: params.clarAccount,
                usr_clar_card_possession: params.clarCardPossession,
                usr_clar_requested_card: params.clarRequestedCard,
                usr_clar_blocked_card: params.clarBlockedCard,
                usr_clar_customer_presence: params.clarCustomerPresence,
                contacto_numero_cliente: params.contacto_numero_cliente
            };

            if (this.verbose) {
                console.log('[Genesys] Sending POST to ' + this.serverUrl + this.endpoints.requestChat);
                console.log('[Genesys] POST data' + JSON.stringify(data));
            }

            $.ajax({
                url: this.serverUrl + this.endpoints.requestChat,
                headers: { 'gms_user': params.gmsUser},
                data: JSON.stringify(data),
                success: onSuccess,
                error: onError,
                crossDomain: true,
                type: 'POST',
                dataType: 'json'
            });
        },

        createChatInteraction: function(params, onSuccess, onError) {
            var data = {
                'service-id': params.serviceId,
                notify_by: 'comet',
                subject: params.chatSubject,
                FirstName: params.customerName,
                LastName: params.customerName,
                email: params.contactEmail,
                EmailAddress: params.contactEmail,
                userDisplayName: params.chatDisplayName
            };

            if (this.verbose) {
                console.log('[Genesys] Sending POST to ' + this.serverUrl + this.endpoints.createChatInteraction.replace('{serviceId}', params.serviceId));
                console.log('[Genesys] POST data' + JSON.stringify(data));
            }

            $.ajax({
                url: this.serverUrl + this.endpoints.createChatInteraction.replace('{serviceId}', params.serviceId),
                headers: { 'gms_user': params.gmsUser},
                data: JSON.stringify(data),
                success: onSuccess,
                error: onError,
                crossDomain: true,
                type: 'POST',
                dataType: 'json'
            });
        },

        refresh: function(params, onSuccess, onError) {
            var data = {
                message: params.text
            };

            if (this.verbose) {
                console.log('[Genesys] Sending POST to ' + this.endpoints.refresh.replace('{serviceId}', params.serviceId));
            }

            if (params.emptyBody) {
                if (this.verbose) {
                    console.log('[Genesys] POST data {}');
                }

                $.ajax({
                    url: this.serverUrl + this.endpoints.refresh.replace('{serviceId}', params.serviceId),
                    headers: {'gms_user': params.gmsUser},
                    data: '{}',
                    success: onSuccess,
                    error: onError,
                    crossDomain: true,
                    type: 'POST',
                    contentType: "application/json; charset=utf-8",
                    dataType: 'json'
                });
            } else {
                if (this.verbose) {
                    console.log('[Genesys] POST data ' + JSON.stringify(data));
                }

                $.ajax({
                    url: this.serverUrl + this.endpoints.refresh.replace('{serviceId}', params.serviceId),
                    headers: {'gms_user': params.gmsUser},
                    data: JSON.stringify(data),
                    success: onSuccess,
                    error: onError,
                    crossDomain: true,
                    type: 'POST',
                    dataType: 'json'
                });
            }
        },

        disconnect: function(params, onSuccess, onError) {
            if (this.verbose) {
                console.log('[Genesys] Sending POST to ' + this.serverUrl + this.endpoints.disconnect.replace('{serviceId}', params.serviceId));
                console.log('[Genesys] POST data' + JSON.stringify({ message: params.text }));
            }

            $.ajax({
                url: this.serverUrl + this.endpoints.disconnect.replace('{serviceId}', params.serviceId),
                headers: { 'gms_user': params.gmsUser},
                data: {
                    message: params.text
                },
                success: onSuccess,
                error: onError,
                crossDomain: true,
                type: 'POST',
                dataType: 'json'
            });
        }
    });

    return GenesysClient;
});