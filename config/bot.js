var watson = require('watson-developer-cloud');
var WORKSPACE_ID = "62ef38a3-e701-473d-8fb3-27b14b1cfcb0";
var cfenv = require('cfenv');
var fs = require('fs');
// load local VCAP configuration
var vcapLocal_a = null;
var appEnv_a = null;
var appEnvOpts_a = {};
var conversationWorkspace_a, conversation_a;
fs.stat('./vcap-local.json', function (err, stat) {
    if (err && err.code === 'ENOENT') {
        // file does not exist
        console.log('No vcap-local.json');
        initializeAppEnv();
    } else if (err) {
        console.log('Error retrieving local vcap: ', err.code);
    } else {
        vcapLocal_a = require("../vcap-local.json");
        console.log("Loaded local VCAP", vcapLocal_a);
        appEnvOpts_a = {
            vcap: vcapLocal_a
        };
        initializeAppEnv();
    }
});
// get the app environment from Cloud Foundry, defaulting to local VCAP
function initializeAppEnv() {
    appEnv_a = cfenv.getAppEnv(appEnvOpts_a);
    if (appEnv_a.isLocal) {
        require('dotenv').load();
    }
    if (appEnv_a.services.conversation) {
        initConversation();
    } else {
        console.error("No Watson conversation service exists");
    }
}

// =====================================
// CREATE THE SERVICE WRAPPER ==========
// =====================================
// Create the service wrapper
function initConversation() {
    var conversationCredentials_a = appEnv_a.getServiceCreds("Bot-sdl");
    console.log(conversationCredentials_a);
    var conversationUsername_a = process.env.CONVERSATION_USERNAME || conversationCredentials_a.username;
    var conversationPassword_a = process.env.CONVERSATION_PASSWORD || conversationCredentials_a.password;
    var conversationURL_a = process.env.CONVERSATION_URL || conversationCredentials_a.url;
    conversation_a = watson.conversation({
        url: conversationURL_a,
        username: conversationUsername_a,
        password: conversationPassword_a,
        version_date: '2017-04-10',
        version: 'v1'
    });
    // check if the workspace ID is specified in the environment
    conversationWorkspace_a = process.env.CONVERSATION_WORKSPACE;
    // if not, look it up by name or create one
    if (!conversationWorkspace_a) {
        const workspaceId = WORKSPACE_ID; // Workspace name goes here.
        console.log('No conversation workspace configured in the environment.');
        console.log(`Looking for a workspace with id '${workspaceId}'...`);
        conversation_a.listWorkspaces((err, result) => {
            if (err) {
                console.log('Failed to query workspaces. Conversation will not work.', err);
            } else {
                const workspace_a = result.workspaces.find(workspace => workspace.workspace_id === workspaceId);
                if (workspace_a) {
                    conversationWorkspace_a = workspace_a.workspace_id;
                    console.log("Using Watson Conversation with username", conversationUsername_a, "and workspace", conversationWorkspace_a);
                } else {
                    console.log('Importing workspace from ./conversation/conversation-demo.json');
                    // create the workspace
                    const watsonWorkspace_a = JSON.parse(fs.readFileSync('./conversation/conversation-demo.json'));
                    // force the name to our expected name
                    watsonWorkspace_a.name = "SDL-Avatar";
                    conversation_a.createWorkspace(watsonWorkspace_a, (createErr, workspace_a) => {
                        if (createErr) {
                            console.log('Failed to create workspace', err);
                        } else {
                            conversationWorkspace_a = workspace_a.workspace_id;
                            console.log(`Successfully created the workspace '${workspaceId}'`);
                            console.log("Using Watson Conversation with username", conversationUsername_a, "and workspace", conversationWorkspace_a);
                        }
                    });
                }
            }
        });
    } else {
        console.log('Workspace ID was specified as an environment variable.');
        console.log("Using Watson Conversation with username", conversationUsername_a, "and workspace", conversationWorkspace_a);
    }
}
var request = require('request');
// =====================================
// REQUEST =====================
// =====================================
// Allow clients to interact
var chatbot = {
sendMessage: function (req, callback) {
    //        var owner = req.user.username;
    buildContextObject(req, function (err, params) {
            if (err) {
                console.log("Error in building the parameters object: ", err);
                return callback(err);
            }
            if (params.message) {
                var conv = req.body.context.conversation_id;
                var context = req.body.context;
                var res = {
                    intents: [],
                    entities: [],
                    input: req.body.text,
                    output: {
                        text: params.message
                    },
                    context: context
                };
                //                chatLogs(owner, conv, res, () => {
                //                    return 
                callback(null, res);
                //                });
            } else if (params) {
                // Send message to the conversation service with the current context
                conversation_a.message(params, function (err, data) {
                    if (err) {
                        console.log("Error in sending message: ", err);
                        return callback(err);
                    } else {

                        var conv = data.context.conversation_id;
                        console.log("Got response from Bot: ", JSON.stringify(data));
                        callback(null, data);
                    }
        });
            }
    })
}
};

// ===============================================
// LOG MANAGEMENT FOR USER INPUT FOR ANA =========
// ===============================================

// ===============================================
// UTILITY FUNCTIONS FOR CHATBOT AND LOGS ========
// ===============================================
/**
 * @summary Form the parameter object to be sent to the service
 *
 * Update the context object based on the user state in the conversation and
 * the existence of variables.
 *
 * @function buildContextObject
 * @param {Object} req - Req by user sent in POST with session and user message
 */
function buildContextObject(req, callback) {
    var message = req.body.text;
    //    var userTime = req.body.user_time;
    var context;
    if (!message) {
        message = '';
    }
    // Null out the parameter object to start building
    var params = {
        workspace_id: conversationWorkspace_a,
        input: {},
        context: {}
    };


    if (req.body.context) {
        context = req.body.context;
        params.context = context;
    } else {
        context = '';
    }
    // Set parameters for payload to Watson Conversation
    params.input = {
        text: message // User defined text to be sent to service
    };
    // This is the first message, add the user's name and get their healthcare object
    //    if ((!message || message === '') && !context) {
    //        params.context = {
    //            fname: req.user.fname
    //            , lname: req.user.lname
    //        };
    //    }
    return callback(null, params);
}
module.exports = chatbot;
