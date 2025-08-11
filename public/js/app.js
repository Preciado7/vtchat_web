define([
    'jquery',
    'backbone.marionette',
    'model/messageCollection',
    'model/messageModel',
    'views/messageCollectionView',
    'lib/genesysClient',
    'cometd'           // CometD 8.0.9 wrapper
],
function(
    $,
    Mn,
    MessageCollection,
    MessageModel,
    MessageCollectionView,
    GenesysClient,
    CometD
) {
    'use strict';

    var App = Mn.Application.extend({
        // ========================================
        // EXISTING PROPERTIES (PRESERVED)
        // ========================================
        layout: null,
        region: '#app .app-messages',
        models: {},
        mainView: null,
        settings: null,
        cometDConnected: false,
        cometDDisconnecting: false,
        restoringSavedSession: false,
        genesysClient: null,
        chatServiceId: null,
        chatSessionId: null,
        sessionData: {},
        agentPresent: false,
        hasAgentConversation: false,
        genesysSubscription: null,
        verbose: true,
        
        // ========================================
        // COMETD 8.0.9 PROPERTIES
        // ========================================
        cometdInstance: null,           // CometD 8.0.9 instance
        cometdUrl: null,                // CometD URL
        chatServiceName: '_genesys',  // API v2 service name
        connectionAttempts: 0,          // Connection retry counter

        onStart: function() {
            this.initializeHandlebarHelpers();

            this.models.messages = new MessageCollection();

            this.mainView = new MessageCollectionView({ collection: this.models.messages });
            this.showView(this.mainView);
            var today = new Date();
            $('#app .current-date').html('Hoy ' + this._forceTwoDigit(today.getDate()) + '/' + this._forceTwoDigit(today.getMonth() + 1) + '/' + today.getFullYear());

            this.initializeJsBridge();
        },

        initializeJsBridge: function() {
            console.log('[App] initializeJsBridge called');
            if(this.verbose) {
                console.log('Initializing Javascript Bridge');
            }
            jsBridge.registerHandler('sendMessage', _.bind(this.onSendMessage, this));
            jsBridge.registerHandler('disconnect', _.bind(this.onSendDisconnect, this));
            jsBridge.registerHandler('saveSession', _.bind(this.onSendSaveSession, this));

            console.log('[App] Calling jsBridge.call for getInitializationSettings');
            //jsBridge.call('getInitializationSettings', null, _.bind(this.onInitializationSettings, this));
            this.onInitializationSettings(this);
        },

        onInitializationSettings: function(data) {
            console.log('[App] onInitializationSettings called with:', data);
        /**
         * 
           
            var connectionParameters = JSON.parse(data.connectionParameters);
            var sessionParameters = JSON.parse(data.sessionParameters);
            var userParameters = JSON.parse(data.userParameters);
            var extraParameters = JSON.parse(data.extraParameters);
        */ 
        var connectionParameters = {
                    //serverUrl: "/cometd-dev/genesys",
                    serverUrl: "https://gme.banorte.com:8443/genesys",
                    genesysServiceId: "request-chat",
                    genesysChannelId: "mobile",
                    endpointRequestChat: "/1/service/request-chat",
                    endpointCreateChatInteraction: "/1/service/{serviceId}/ixn/chat",
                    endpointRefresh: "/1/service/{serviceId}/ixn/chat/refresh",
                    endpointDisconnect: "/1/service/{serviceId}/ixn/chat/disconnect",
                    contacto_numero_cliente: null
                };
         var sessionParameters = {
                    gmsUser: "usuario_demo",
                    sessionId: null,
                    sessionTimeout: "900",
                    onSessionTimeout: "EpnlTOutCliente(CREATE)|EchtGenesys(CLOSESESSION)",
                    timeOutAgentNotAvailable: "900",
                    onTimeOutAgentNotAvailable: "EpnlTOutAgenNoDisp(CREATE)|EchtGenesys(CLOSESESSION)",
                    onAgentJoined: "P_TPL_CONTACT_S031_AGENT_JOINED",
                    contacto_numero_cliente: null
                };
        var userParameters = {
                    customerSegment: "preferente",
                    contactReason: "bancalinea",
                    customerId: "123456789",
                    customerNumber: "987654321",
                    contactEmail: "demo@cliente.com",
                    customerName: "Esteban Preciado",
                    contacto_numero_cliente: null
                };
        var extraParameters = {
                    mlsdAccount: null,
                    mlsdNip: null,
                    mlsdStatus: null,
                    chatSubject: "Información genérica",
                    chatDisplayName: "Esteban Preciado",
                    clarAccount: null,
                    clarRequestedCard: null,
                    clarCardPossession: null,
                    clarBlockedCard: null,
                    clarCustomerPresence: null,
                    clarReason: null,
                    infoProductType: null,
                    onDisconnect: null,
                    onAgentLeft: "EpnlFinSesionAgente(CREATE)",
                    onClientInBlackList: "EpnlClienteBloqueado(CREATE)|EchtGenesys(CLOSESESSION)",
                    onAgentTypingStarted: "EagenteEscribe(SHOW)",
                    onAgentTypingStopped: "EagenteEscribe(HIDE)",
                    usr_message_background: "La conversación sigue vigente, puedes continuar escribiendo",
                    usr_message_restore_sesion_fail: "Disculpa los incovenientes causados, la conversación anterior dejó de ser vigente. Se unirá un nuevo agente para que continúes",
                    contacto_numero_cliente: null
                };

            var savedSession = "";
            var failMessage = null;
            
            console.log('[App] connectionParameters:', connectionParameters);
            console.log('[App] API version:', connectionParameters.apiVersion);
            console.log('[App] supportsCometD8:', connectionParameters.supportsCometD8);
            if (data.savedSession) {
                failMessage = extraParameters.usr_message_restore_sesion_fail;
                savedSession = JSON.parse(data.savedSession);
                if(this.verbose) {
                    console.log('Saved session found: ' + data.savedSession);
                }
            }

            this.settings = {
                serverUrl: connectionParameters.serverUrl,
                gmsUser: sessionParameters.gmsUser,
                customerNumber: userParameters.customerNumber,
                customerId: userParameters.customerId,
                customerName: userParameters.customerName,
                customerSegment: userParameters.customerSegment,
                contactEmail: userParameters.contactEmail,
                contactReason: userParameters.contactReason,
                contacto_numero_cliente: userParameters.contacto_numero_cliente,
                sessionId: sessionParameters.sessionId,
                requestChatServiceId: connectionParameters.genesysServiceId,
                genesysChannelId: connectionParameters.genesysChannelId,
                mlsdStatus: extraParameters.mlsdStatus,
                mlsdAccount: extraParameters.mlsdAccount,
                mlsdNip: extraParameters.mlsdNip,
                infoProductType: extraParameters.infoProductType,
                clarReason: extraParameters.clarReason,
                clarAccount: extraParameters.clarAccount,
                clarCardPossession: extraParameters.clarCardPossession,
                clarRequestedCard: extraParameters.clarRequestedCard,
                clarBlockedCard: extraParameters.clarBlockedCard,
                clarCustomerPresence: extraParameters.clarCustomerPresence,
                chatSubject: extraParameters.chatSubject,
                chatDisplayName: extraParameters.chatDisplayName,
                userMessageBackground: extraParameters.usr_message_background,
                restoreSessionFailMessage: failMessage,
                endpoints: {
                    requestChat: connectionParameters.endpointRequestChat,
                    createChatInteraction: connectionParameters.endpointCreateChatInteraction,
                    refresh: connectionParameters.endpointRefresh,
                    disconnect: connectionParameters.endpointDisconnect
                }
            };

            if (!this.settings.endpoints.requestChat || !this.settings.endpoints.createChatInteraction || !this.settings.endpoints.refresh ||
                !this.settings.endpoints.disconnect) {

                this.notifyErrorToHost('connection_parameters_endpoint_fail', 'Missing connection parameter');
            }

            console.log('Initialization settings received:' + JSON.stringify(this.settings));
            
            // Set CometD URL for API v2
            //this.cometdUrl = this.settings.serverUrl + '/genesys/cometd';
            this.cometdUrl = this.settings.serverUrl + '/cometd';
            console.log('[App] Using CometD 8.0.9 with API v2');

            if (savedSession) {
                this.restoreSavedSession(savedSession);
                return;
            }

            this.sendRequestChat();
        },

        sendRequestChat: function() {
            var params = {
                gmsUser: this.settings.gmsUser,
                customerNumber: this.settings.customerNumber,
                customerId: this.settings.customerId,
                customerName: this.settings.customerName,
                customerSegment: this.settings.customerSegment,
                contactEmail: this.settings.contactEmail,
                contactReason: this.settings.contactReason,
                contacto_numero_cliente: this.settings.contacto_numero_cliente,
                sessionId: this.settings.sessionId,
                requestChatServiceId: this.settings.requestChatServiceId,
                genesysChannelId: this.settings.genesysChannelId,
                mlsdStatus: this.settings.mlsdStatus,
                mlsdAccount: this.settings.mlsdAccount,
                mlsdNip: this.settings.mlsdNip,
                infoProductType: this.settings.infoProductType,
                clarReason: this.settings.clarReason,
                clarAccount: this.settings.clarAccount,
                clarCardPossession: this.settings.clarCardPossession,
                clarRequestedCard: this.settings.clarRequestedCard,
                clarBlockedCard: this.settings.clarBlockedCard,
                clarCustomerPresence: this.settings.clarCustomerPresence
            };

            console.log('[Genesys] Sending request chat...');
            this.genesysClient = new GenesysClient({ serverUrl: this.settings.serverUrl, verbose: this.verbose, endpoints: this.settings.endpoints });
            this.genesysClient.requestChat(params, _.bind(this.onGenesysRequestChat, this),  _.bind(function(jqXhr, textStatus, errorThrown) {
                if (textStatus === 'abort' || textStatus === 'timeout') {
                    this.notifyErrorToHost('connection_error', 'Connection Error', errorThrown);
                } else {
                    this.notifyErrorToHost('genesys_request_chat_fail', 'Genesys request chat failed', errorThrown);
                }
            }, this));
        },

        restoreSavedSession: function(savedSession) {
            this.sessionData = savedSession;
            this.restoringSavedSession = true;
            this.settings.gmsUser = savedSession.gmsUser;

            console.log('[Genesys] Trying to restore saved session: ' + JSON.stringify(savedSession));

            var data = {
                channel: '/meta/disconnect',
                id: savedSession.id,
                clientId: savedSession.clientId,
                ext: {
                    transcriptPosition: savedSession.transcriptPosition.toString()
                }
            };

            if (this.verbose) {
                console.log('[Genesys] Sending POST to ' + this.cometdUrl + '/disconnect');
                console.log('[Genesys] POST data' + JSON.stringify(data));
                console.log('[Genesys] Headers: gms_user: ' + this.settings.gmsUser);
            }

            $.ajax({
                url: this.cometdUrl + '/disconnect',
                async: true,
                type: 'POST',
                contentType: 'application/json;charset=UTF-8',
                data: JSON.stringify(data),
                global: false,
                xhrFields: {
                    // For asynchronous calls.
                    withCredentials: true
                },
                beforeSend: _.bind(function(xhr) {
                    // For synchronous calls.
                    xhr.withCredentials = true;
                    xhr.setRequestHeader('gms_user', this.settings.gmsUser);
                    // Returning false will abort the XHR send.
                    return true;
                }, this),
                success: _.bind(function(data, status, xhr) {
                    console.log('[CometD] Disconnect success:' + JSON.stringify(data));
                    this.genesysClient = new GenesysClient({ serverUrl: this.settings.serverUrl, verbose: this.verbose });
                    var params = {
                        gmsUser: this.settings.gmsUser,
                        serviceId: savedSession.chatServiceId,
                        text: null,
                        emptyBody: true
                    };
                    this.genesysClient.refresh(
                        params,
                        _.bind(function(data) {
                            console.log('[Genesys] Refresh success ', data);
                            this.initializeCometD();
                            console.log('[CometD] Sending handshake...');
                            
                            this.cometdInstance.handshake();
                        }, this),
                        _.bind(function(jqXhr, textStatus, errorThrown) {
                            console.log('[Genesys] Refresh error:' + textStatus + ' ' + JSON.stringify(errorThrown));
                            this.notifyErrorToHost('restore_session_fail', 'Restore session failed');
                        }, this)
                    );

                }, this),
                error: _.bind(function(xhr, reason, exception) {
                    console.log('[CometD] Disconnect error:' + reason + ' ' + JSON.stringify(exception));
                    this.notifyErrorToHost('restore_session_fail', 'Restore session failed');
                }, this)
            });
        },

        finishRestoringSavedSession: function(connectResponse) {
            console.log('Finish restoring saved session...');
            this.agentPresent = this.sessionData.agentPresent;
            this.chatServiceId = this.sessionData.chatServiceId;
            this.chatSessionId = this.sessionData.chatSessionId;
            console.log(JSON.stringify(this.sessionData.messages));
            this.models.messages.reset(this.sessionData.messages);

            if (connectResponse !== null) {
                this.onCometDReceive(connectResponse);
            }

            this.models.messages.sort();
            this.restoringSavedSession = false;
            jsBridge.call('statusChange', { status: 'connected'}, function (data) {});
            if (this.agentPresent) {
                jsBridge.call('statusChange', { status: 'agentJoined'}, function (data) {});
            }

            if (this.settings.userMessageBackground) {
                this.onSendMessage({ text: this.settings.userMessageBackground }, () => {});
            }
        },

        onSendDisconnect: function(data, responseCallback) {
            console.log('[CometD] Disconnect called...');
            var params = {
                gmsUser: this.settings.gmsUser,
                serviceId: this.chatServiceId
            };
            this.cometDDisconnecting = true;
            this.genesysClient.disconnect(
                params,
                _.bind(function(data) {
                    responseCallback(true);
                    var doDisconnect = _.bind(function() {
                        this.cometdInstance.disconnect();
                        this.cometDConnected = false;
                        this.cometDDisconnecting = false;
                        this.chatServiceId = null;
                        this.chatSessionId = null;
                        this.agentPresent = false;
                    }, this);

                    if (this.genesysSubscription) {
                        this.cometdInstance.unsubscribe(this.genesysSubscription, doDisconnect);
                        this.genesysSubscription = null;
                    } else {
                        doDisconnect();
                    }
                }, this),
                _.bind(function(jqXhr, textStatus, errorThrown) {
                    if (textStatus === 'abort' || textStatus === 'timeout') {
                        this.notifyErrorToHost('connection_error', 'Connection Error', errorThrown);
                    } else {
                        this.notifyErrorToHost('genesys_disconnect_fail', 'Genesys disconnect failed', errorThrown);
                    }
                    responseCallback(false);
                }, this)
            );
        },

        onSendMessage: function(message, responseCallback) {
            if (!this.agentPresent || !this.cometDConnected) {
                responseCallback(false);
                return;
            }

            var params = {
                gmsUser: this.settings.gmsUser,
                serviceId: this.chatServiceId,
                text: message.text
            };

            var lastId = 1;
            if (this.models.messages.length > 0) {
                lastId = this.models.messages.last().get('id');
            }
            var messageModel = new MessageModel({ id: lastId + 1, text: message.text, isMine: true, date: new Date() });

            this.genesysClient.refresh(
                params,
                _.bind(function(data) {
                    console.log('[Genesys] Send message success ', data);
                    messageModel.set('id', parseInt(data.transcriptPosition));
                    this.sessionData.transcriptPosition = parseInt(data.transcriptPosition);
                    console.log('refresh transcript position:' + this.sessionData.transcriptPosition);
                    this.models.messages.sort();
                }, this),
                _.bind(function(jqXhr, textStatus, errorThrown) {
                    if (textStatus === 'abort' || textStatus === 'timeout') {
                        this.notifyErrorToHost('connection_error', 'Connection Error', errorThrown);
                    } else {
                        this.notifyErrorToHost('genesys_refresh_fail', 'Genesys refresh failed', errorThrown);
                    }
                }, this)
            );

            this.models.messages.add(messageModel);

            responseCallback(true);
        },

        // ========================================
        // CRITICAL: Updated CometD initialization
        // ========================================
        initializeCometD: function() {
            console.log('[App] initializeCometD called');
            console.log('[App] cometdUrl:', this.cometdUrl);
            
            // CometD 8.0.9 initialization
            console.log('[App] Initializing CometD 8.0.9 with URL:', this.cometdUrl);
            
            try {
                // Create CometD 8.0.9 instance
                console.log('[App] Creating CometD 8.0.9 instance...');
                this.cometdInstance = new CometD.CometD();
                console.log('[App] CometD instance created:', this.cometdInstance);
                
                // Register extensions and transports
                console.log('[App] Registering CometD extensions and transports...');
                CometD.registerExtensions(this.cometdInstance);
                CometD.registerTransports(this.cometdInstance);
                
                // Configure CometD 8.0.9
                this.cometdInstance.configure({
                    url: this.cometdUrl,
                    logLevel: this.verbose ? 'debug' : 'warn',
                    transports: ['websocket', 'long-polling'],
                    maxNetworkDelay: 15000,
                    requestHeaders: { 
                        'gms_user': this.settings.gmsUser,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    stickyReconnect: true,
                    maxReconnectAttempts: 5,
                    reconnectIntervalMultiplier: 1.5
                });
                
                // Set up event listeners
                console.log('[App] Setting up CometD event listeners...');
                this.cometdInstance.addListener('/meta/handshake', _.bind(this.onCometDHandshake, this));
                this.cometdInstance.addListener('/meta/connect', _.bind(this.onCometDConnect, this));
                this.cometdInstance.addListener('/meta/disconnect', _.bind(this.onCometDDisconnect, this));
                this.cometdInstance.addListener('/meta/unsuccessful', _.bind(this.onCometDUnsuccessful, this));
                console.log('[App] Event listeners set up successfully');
                
                console.log('[CometD] CometD 8.0.9 initialized successfully');
                
            } catch (error) {
                console.error('[CometD] Failed to initialize CometD 8.0.9:', error);
                this.notifyErrorToHost('cometd_init_error', 'CometD initialization failed', error.toString());
                return;
            }
        },


        onCometDHandshake: function(message) {
            console.log('[CometD] Handshake received:' + JSON.stringify(message));
            
            // NEW: Handle both direct message format and wrapped data format
            var handshakeData = message.data || message;
            var successful = handshakeData.successful;
            
            console.log('[CometD] Handshake data:', handshakeData);
            console.log('[CometD] Handshake successful:', successful);
            
            if (!successful) {
                if (handshakeData.failure && (handshakeData.failure.reason === 'abort' || handshakeData.failure.reason.includes('exceeded'))) {
                    this.notifyErrorToHost('connection_error', 'Connection Error', handshakeData.failure.reason);
                } else {
                    this.notifyErrorToHost('cometd_handshake_fail', 'CometD handshake failed', JSON.stringify(message));
                }
                return;
            }

            // PRESERVED: Session data handling
            this.sessionData.id = handshakeData.id || message.id;
            this.sessionData.clientId = handshakeData.clientId || message.clientId;
            this.connectionAttempts = 0;  // Reset retry counter

            console.log('[CometD] Sending subscribe...');
            
            // Subscribe to API v2 channel
            var subscribeChannel = '/' + this.chatServiceName;
            
            console.log('[CometD] Subscription channel:', subscribeChannel);
            console.log('[CometD] cometdInstance:', this.cometdInstance);
            
            console.log('[CometD] Using CometD 8.0.9 subscription');
            this.genesysSubscription = this.cometdInstance.subscribe(subscribeChannel, _.bind(this.onCometDReceive, this));
            
            console.log('[CometD] Subscription created:', this.genesysSubscription);
        },

        onCometDConnect: function(message) {
            console.log('[CometD] Connect received:' +  JSON.stringify(message));

            var restoreSessionMessage = null;
            if (Array.isArray(message) && this.restoringSavedSession) {
                restoreSessionMessage = message[0];
                message = message[1];
            }

            // NEW: Handle both direct message format and wrapped data format
            var connectData = message.data || message;
            var successful = connectData.successful;
            
            console.log('[CometD] Connect data:', connectData);
            console.log('[CometD] Connect successful:', successful);

            if (!successful) {
                this.agentPresent = false;
                if (this.restoringSavedSession) {
                    this.notifyErrorToHost('restore_session_fail', 'Restore session failed');
                    return;
                }

                if (connectData.failure && (connectData.failure.reason === 'abort' || connectData.failure.reason.includes('exceeded'))) {
                    this.notifyErrorToHost('connection_error', 'Connection Error', connectData.failure.reason);
                } else {
                    this.notifyErrorToHost('cometd_connect_fail', 'CometD connect failed', JSON.stringify(message));
                }
                return;
            }

            this.sessionData.id = connectData.id || message.id;

            if (this.cometDDisconnecting) {
                this.cometDConnected = false;
                this.chatSessionId = null;
                this.chatServiceId = null;
                this.agentPresent = false;
                jsBridge.call('statusChange', { status: 'disconnected'}, function (data) {});
                console.log('[CometD] Connection to server closed');
            } else {
                var wasConnected = this.cometDConnected;
                this.cometDConnected = message.successful === true;
                if (!wasConnected && this.cometDConnected) {
                    console.log('[CometD] Connection to server opened');
                    if (this.restoringSavedSession) {
                        this.finishRestoringSavedSession(restoreSessionMessage);

                        return;
                    }
                    var params = {
                        gmsUser: this.settings.gmsUser,
                        serviceId: this.chatServiceId,
                        chatSubject: this.settings.chatSubject,
                        customerName: this.settings.customerName,
                        contactEmail: this.settings.contactEmail,
                        chatDisplayName: this.settings.chatDisplayName
                    };
                    console.log('[Genesys] Creating chat interaction');
                    this.genesysClient.createChatInteraction(params, _.bind(this.onGenesysCreateChatInteraction, this), _.bind(function(jqXhr, textStatus, errorThrown) {
                        if (textStatus === 'abort' || textStatus === 'timeout') {
                            this.notifyErrorToHost('connection_error', 'Connection Error', errorThrown);
                        } else {
                            this.notifyErrorToHost('genesys_create_chat_interaction_fail', 'Genesys create chat interaction failed', errorThrown);
                        }
                    }, this));
                } else if (wasConnected && !this.cometDConnected) {
                    this.agentPresent = false;
                    jsBridge.call('statusChange', { status: 'disconnected'}, function (data) {});
                    console.log('[CometD] Connection to server broken');
                } else if(wasConnected && this.hasAgentConversation && !this.agentPresent){
                    this.agentPresent=true;
                    console.log('[CometD] Connection with agent is back');
                }
            }
        },

        // NEW: CometD 8.0.9 disconnect handler
        onCometDDisconnect: function(message) {
            console.log('[CometD] Disconnected:', message);
            this.cometDConnected = false;
            
            if (!this.cometDDisconnecting) {
                this.handleUnexpectedDisconnect();
            }
        },

        // NEW: CometD 8.0.9 unsuccessful handler
        onCometDUnsuccessful: function(message) {
            console.error('[CometD] Unsuccessful operation:', message);
            this.handleConnectionError(message);
        },

        // NEW: Connection error handling
        handleConnectionError: function(message) {
            this.connectionAttempts = (this.connectionAttempts || 0) + 1;
            
            if (this.connectionAttempts < 3) {
                console.log('[CometD] Retrying connection, attempt:', this.connectionAttempts);
                setTimeout(_.bind(function() {
                    this.cometdInstance.handshake();
                }, this), 2000 * this.connectionAttempts);
            } else {
                console.error('[CometD] Max connection attempts reached');
                this.notifyErrorToHost('connection_error', 'Connection failed after multiple attempts', message.error || 'Unknown error');
            }
        },

        // NEW: Handle unexpected disconnects
        handleUnexpectedDisconnect: function() {
            console.log('[CometD] Unexpected disconnect, attempting reconnection');
            setTimeout(_.bind(function() {
                this.cometdInstance.handshake();
            }, this), 1000);
        },

        // NEW: Handle API v2 message format
        handleApiV2Message: function(data) {
            console.log('[CometD] Handling API v2 message:', data.notificationType);
            
            switch (data.notificationType) {
                case 'messageReceived':
                    this.handleApiV2MessageReceived(data);
                    break;
                case 'agentJoined':
                case 'ParticipantJoined':  // Official Genesys API v2 name
                    this.handleApiV2AgentJoined(data);
                    break;
                case 'agentLeft':
                case 'ParticipantLeft':   // Official Genesys API v2 name
                    this.handleApiV2AgentLeft(data);
                    break;
                case 'typingIndicator':
                    this.handleApiV2TypingIndicator(data);
                    break;
                case 'pushNotification':
                case 'PushUrl':           // Official Genesys API v2 name
                    this.handleApiV2PushNotification(data);
                    break;
                case 'FileUploaded':      // Official Genesys API v2 event
                    this.handleApiV2FileUploaded(data);
                    break;
                case 'CustomNotice':      // Official Genesys API v2 event
                    this.handleApiV2CustomNotice(data);
                    break;
                default:
                    console.log('[CometD] Unknown API v2 notification type:', data.notificationType);
            }
        },

        handleApiV2MessageReceived: function(data) {
            console.log('[CometD] API v2 message received:', data.text);
            console.log('[CometD] API v2 message data.from:', data.from);
            console.log('[CometD] API v2 message isMine calculation:', data.from === 'customer');
            
            var messageId = this.models.messages.length > 0 ? this.models.messages.last().get('id') + 1 : 1;
            var isMine = data.from === 'customer';
            
            console.log('[CometD] Creating message with isMine:', isMine);
            console.log('[CometD] Message will be added to collection with these properties:');
            console.log('[CometD] - id:', messageId);
            console.log('[CometD] - text:', data.text);
            console.log('[CometD] - isMine:', isMine);
            console.log('[CometD] - date:', new Date(data.timestamp));
            
            var newMessage = new MessageModel({
                id: messageId,
                text: data.text,
                isMine: isMine,
                date: new Date(data.timestamp)
            });
            
            console.log('[CometD] Created MessageModel:', newMessage.toJSON());
            
            this.models.messages.add(newMessage);
            
            // Update transcript position
            this.sessionData.transcriptPosition = messageId;
        },

        handleApiV2AgentJoined: function(data) {
            console.log('[CometD] API v2 agent joined:', data.agentName);
            
            var messageId = this.models.messages.length > 0 ? this.models.messages.last().get('id') + 1 : 1;
            
            this.models.messages.add(new MessageModel({
                id: messageId,
                text: data.agentName + ' se ha unido a la conversación',
                isMine: false,
                date: new Date(data.timestamp)
            }));
            
            this.agentPresent = true;
            this.hasAgentConversation = true;
            jsBridge.call('statusChange', {status: 'agentJoined'}, function (data) { });
        },

        handleApiV2AgentLeft: function(data) {
            console.log('[CometD] API v2 agent left:', data.agentName);
            
            var messageId = this.models.messages.length > 0 ? this.models.messages.last().get('id') + 1 : 1;
            
            this.models.messages.add(new MessageModel({
                id: messageId,
                text: data.agentName + ' ha abandonado la conversación',
                isMine: false,
                date: new Date(data.timestamp)
            }));
            
            this.agentPresent = false;
            jsBridge.call('statusChange', {status: 'agentLeft'}, function (data) { });
        },

        handleApiV2TypingIndicator: function(data) {
            console.log('[CometD] API v2 typing indicator:', data.isTyping ? 'started' : 'stopped');
            // Could show typing indicator in UI if needed
        },

        handleApiV2PushNotification: function(data) {
            console.log('[CometD] API v2 push notification:', data.type, data.payload);
            // Handle push notification display
        },

        handleApiV2FileUploaded: function(data) {
            console.log('[CometD] API v2 file uploaded:', data.fileName, data.fileUrl);
            
            var messageId = this.models.messages.length > 0 ? this.models.messages.last().get('id') + 1 : 1;
            
            this.models.messages.add(new MessageModel({
                id: messageId,
                text: 'File uploaded: ' + (data.fileName || 'file'),
                isMine: data.from === 'customer',
                date: new Date(data.timestamp || Date.now())
            }));
        },

        handleApiV2CustomNotice: function(data) {
            console.log('[CometD] API v2 custom notice:', data.noticeType, data.text);
            
            var messageId = this.models.messages.length > 0 ? this.models.messages.last().get('id') + 1 : 1;
            
            // Handle custom notices like WELCOME, AGENTNOTAVAILABLE, etc.
            this.models.messages.add(new MessageModel({
                id: messageId,
                text: data.text || data.message || 'Custom notice',
                isMine: false,
                date: new Date(data.timestamp || Date.now())
            }));
        },

        onCometDReceive: function(message) {
            this.sessionData.id = message.id;

            console.log('[CometD] Message received:' + JSON.stringify(message));
            console.log('[CometD] Message channel:', message.channel);
            console.log('[CometD] Message data:', message.data);
            jsBridge.call('receivedMessage', { messageJson: JSON.stringify(message) }, function (data) {});
            
            // NEW: Handle API v2 message format
            if (message.data && message.data.notificationType) {
                console.log('[CometD] Processing API v2 message:', message.data.notificationType);
                console.log('[CometD] API v2 message data:', message.data);
                this.handleApiV2Message(message.data);
                return;
            }
            
            // EXISTING: Handle legacy message format
            if (message.data.message.chatSessionId !== this.chatSessionId) {
                console.log('[CometD] Ignoring message due to wrong sessionId: ' + message.data.message.chatSessionId + '(' +  this.chatSessionId + ')');
                return;
            }

            if (!this.cometDConnected || this.cometDDisconnecting) {
                console.log('[CometD] Ignoring message due to cometD disconnected');
                return;
            }

            var transcripts = message.data.message.transcriptToShow;
            var startTime = (Date.parse(message.data.message.startedAt));

            this.sessionData.transcriptPosition = parseInt(message.data.message.transcriptPosition);
            console.log('receive transcript position:' + this.sessionData.transcriptPosition);

            // Check agent transfer special case
            if (transcripts.length === 2 && transcripts[0][0] === 'Notice.Left' && transcripts[1][0] === 'Notice.Joined' &&
                transcripts[0][4] === 'AGENT' && transcripts[1][4] === 'AGENT' && transcripts[0][1] !== transcripts[1][1]) {

                console.log('Processing agent transfer');

                for (var i = 0; i < transcripts.length; i++) {
                    var transcript = transcripts[i];
                    var transcriptPosition = parseInt(message.data.message.transcriptPosition) - (transcripts.length - 1) + i;

                    console.log('[CometD] Processing transcript: ' + transcript[0] + '(position ' + transcriptPosition + ')');
                    jsBridge.call(
                        'receivedTranscript',
                        {
                            type: transcript[0],
                            username: transcript[1],
                            text: transcript[2],
                            position: transcriptPosition,
                            actor: transcript[4],
                            time: startTime + transcript[3] * 1000
                        },
                        function (data) { }
                    );

                    if (transcript[0] === 'Notice.Joined') {
                        this.models.messages.add(new MessageModel({
                            id: transcriptPosition,
                            text: transcript[1] + ' se ha unido a la conversación',
                            isMine: false,
                            date: new Date(startTime + transcript[3] * 1000)
                        }));
                    } else if (transcript[0] === 'Notice.Left') {
                        this.models.messages.add(new MessageModel({
                            id: transcriptPosition,
                            text: transcript[1] + ' ha abandonado la conversación',
                            isMine: false,
                            date: new Date(startTime + transcript[3] * 1000)
                        }));
                    }
                }

                return;
            }

            for(var i = 0; i < transcripts.length; i++) {
                var transcript = transcripts[i];
                var transcriptPosition = parseInt(message.data.message.transcriptPosition) - (transcripts.length - 1) + i;

                if (transcript[4] !== 'AGENT' && transcript[0] !== 'Notice.Custom') {
                    console.log('[CometD] Ignore transcript: ' + transcript[4]);
                    continue;
                }

                console.log('[CometD] Processing transcript: ' + transcript[0] + '(position ' + transcriptPosition + ')');
                jsBridge.call(
                    'receivedTranscript',
                    {
                        type: transcript[0],
                        username: transcript[1],
                        text: transcript[2],
                        position: transcriptPosition,
                        actor: transcript[4],
                        time: startTime + transcript[3] * 1000
                    },
                    function (data) {}
                );

                if (transcript[0] === 'Notice.Joined') {
                    this.models.messages.add(new MessageModel({
                        id: transcriptPosition,
                        text: transcript[1] + ' se ha unido a la conversación',
                        isMine: false,
                        date: new Date(startTime + transcript[3] * 1000)
                    }));
                    this.agentPresent = true;
                    this.hasAgentConversation=true;
                    jsBridge.call('statusChange', {status: 'agentJoined'}, function (data) { });
                } else if (transcript[0] === 'Message.Text' || transcript[0] === 'Notice.PushUrl') {
                    this.models.messages.add(new MessageModel({
                        id: transcriptPosition,
                        text: transcript[2],
                        isMine: false,
                        date: new Date(startTime + transcript[3] * 1000)
                    }));
                } else if (transcript[0] === 'Notice.Left') {
                    this.models.messages.add(new MessageModel({
                        id: transcriptPosition,
                        text: transcript[1] + ' ha abandonado la conversación',
                        isMine: false,
                        date: new Date(startTime + transcript[3] * 1000)
                    }));
                    this.agentPresent = false;
                    jsBridge.call('statusChange', {status: 'agentLeft'}, function (data) { });
                } else if (transcript[0] === 'Notice.Custom') {
                    var messageComponents = transcript[2].split('||');
                    if (messageComponents.length < 2) {
                        continue;
                    }
                    var text = messageComponents[0];
                    var messageType = messageComponents[1];
                    if (messageType === 'WELCOME') {
                        var customizedText = text.replace('{NOMBRE_USUARIO}', this.settings.customerName);
                        this.models.messages.add(new MessageModel({
                            id: transcriptPosition,
                            text: customizedText,
                            isMine: false,
                            date: new Date(startTime + transcript[3] * 1000)
                        }));
                    } else if (messageType === 'CLIENTBLACKLIST') {
                        this.models.messages.add(new MessageModel({
                            id: transcriptPosition,
                            text: text,
                            isMine: false,
                            date: new Date(startTime + transcript[3] * 1000)
                        }));
                        this.onSendDisconnect({}, function() {});
                    } else if (messageType === 'AGENTNOTAVAILABLE') {
                        this.models.messages.add(new MessageModel({
                            id: transcriptPosition,
                            text: text,
                            isMine: false,
                            date: new Date(startTime + transcript[3] * 1000)
                        }));
                    }
                }
            }

            if (message.data.message.chatIxnState === 'DISCONNECTED') {
                var doDisconnect = _.bind(function() {
                    this.cometdInstance.disconnect();
                    jsBridge.call('statusChange', { status: 'disconnected'}, function (data) {});
                    this.cometDConnected = false;
                    this.cometDDisconnecting = false;
                    this.chatServiceId = null;
                    this.chatSessionId = null;
                    this.agentPresent = false;
                }, this);

                if (this.genesysSubscription) {
                    this.cometdInstance.unsubscribe(this.genesysSubscription, doDisconnect);
                    this.genesysSubscription = null;
                } else {
                    doDisconnect();
                }
            }
        },

        onGenesysRequestChat: function(data, status, xhr) {
            console.log('[Genesys] Request chat response:' + JSON.stringify(data));
            if (!data._id) {
                this.notifyErrorToHost('genesys_request_chat_fail', 'Genesys request chat failed', JSON.stringify(data));
                return;
            }

            this.chatServiceId = data._id;

            this.initializeCometD();
            
            console.log('[CometD] Sending handshake...');
            this.cometdInstance.handshake();
        },

        onGenesysCreateChatInteraction: function(data) {
            console.log('[Genesys] Create chat interaction response:' + JSON.stringify(data));

            if (data.chatIxnState === 'DISCONNECTED') {
                var doDisconnect = _.bind(function() {
                    this.cometdInstance.disconnect();
                    jsBridge.call('statusChange', { status: 'disconnected'}, function (data) {});
                    this.cometDConnected = false;
                    this.cometDDisconnecting = false;
                    this.chatServiceId = null;
                    this.chatSessionId = null;
                    this.agentPresent = false;
                }, this);

                if (this.genesysSubscription) {
                    this.cometdInstance.unsubscribe(this.genesysSubscription, doDisconnect);
                    this.genesysSubscription = null;
                } else {
                    doDisconnect();
                }
                return;
            }

            if (!data.chatSessionId) {
                this.notifyErrorToHost('genesys_create_chat_interaction_fail', 'Genesys create chat interaction failed', JSON.stringify(data));
                return;
            }

            this.sessionData.transcriptPosition = parseInt(data.transcriptPosition);
            console.log('create chat interaction transcript position:' + this.sessionData.transcriptPosition);
            this.chatSessionId = data.chatSessionId;


            jsBridge.call('statusChange', { status: 'connected'}, function (data) {});

            if (this.settings.restoreSessionFailMessage) {
                var messageModel = new MessageModel({ id: 0, text: this.settings.restoreSessionFailMessage, isMine: false, date: new Date() });
                this.models.messages.add(messageModel);
            }
        },

        onSendSaveSession: function(data, responseCallback) {
            this.sessionData.gmsUser = this.settings.gmsUser;
            this.sessionData.agentPresent = this.agentPresent;
            this.sessionData.chatServiceId = this.chatServiceId;
            this.sessionData.chatSessionId = this.chatSessionId;
            this.sessionData.messages = this.models.messages.toJSON();
            responseCallback(JSON.stringify(this.sessionData));
        },

        notifyErrorToHost: function(type, description, details) {
            console.error('Error: type: ' + type + ', description: ' + description + ', details: ' + details);
            jsBridge.call('error', {type: type, description: description, details: details}, _.bind(function (data) {}, this));
        },

        initializeHandlebarHelpers: function() {
            Handlebars.registerHelper('ifeq', function(a, b, block) {
                return a == b ? block.fn() : block.inverse();
            });
            Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
                switch (operator) {
                    case '==': return (v1 == v2) ? options.fn(this) : options.inverse(this);
                    case '===': return (v1 === v2) ? options.fn(this) : options.inverse(this);
                    case '<': return (v1 < v2) ? options.fn(this) : options.inverse(this);
                    case '<=': return (v1 <= v2) ? options.fn(this) : options.inverse(this);
                    case '>': return (v1 > v2) ? options.fn(this) : options.inverse(this);
                    case '>=': return (v1 >= v2) ? options.fn(this) : options.inverse(this);
                    case '&&': return (v1 && v2) ? options.fn(this) : options.inverse(this);
                    case '||': return (v1 || v2) ? options.fn(this) : options.inverse(this);
                    default: return options.inverse(this);
                }
            });
            var that = this;
            Handlebars.registerHelper('formatChatDate', function(date) {
                var today = new Date();
                var dateObj = new Date(date);
                if (dateObj.getFullYear() === today.getFullYear() && dateObj.getMonth() === today.getMonth() && dateObj.getDay() === today.getDay()) {
                    return that._forceTwoDigit(dateObj.getHours()) + ':' + that._forceTwoDigit(dateObj.getMinutes()) + ':' + that._forceTwoDigit(dateObj.getSeconds());
                } else {
                    return that._forceTwoDigit(dateObj.getDay()) + '/' + that._forceTwoDigit(dateObj.getMonth()) + '/' + dateObj.getFullYear() + ' ' +
                        that._forceTwoDigit(dateObj.getHours()) + ':' + that._forceTwoDigit(dateObj.getMinutes()) + ':' + that._forceTwoDigit(dateObj.getSeconds());
                }
            });
            Handlebars.registerHelper('nl2br', function(text) {
                return Handlebars.Utils.escapeExpression(text).replace(/(?:\r\n|\r|\n)/g, '<br />');
            });
        },

        _forceTwoDigit: function(digits) {
            if (digits.toString().length === 1) {
                return '0' + digits;
            }  else {
                return digits;
            }
        },
    });

    return new App();
});
