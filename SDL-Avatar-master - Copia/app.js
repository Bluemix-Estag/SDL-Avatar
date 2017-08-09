

var saml2 = require('saml2-js');
var Saml2js = require('saml2js');
var fs = require('fs');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var chatbot = require('./config/bot.js');
var express = require('express');
var cfenv = require('cfenv');

var saml2FJ = require('saml2fj');


// load local VCAP configuration
var vcapLocal = null;
var appEnv = null;
var appEnvOpts = {};


// create a new express server
var path = require('path');
var app = express();
var http = require('http');
app.set('port', process.env.PORT || 4000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);


app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/style', express.static(path.join(__dirname, '/views/style')));
app.use('/scripts', express.static(path.join(__dirname, '/views/scripts')));

var url = 'https://sdl.mybluemix.net';

// Create service provider
var sp_options = {
  entity_id: url + "/metadata.xml",
  private_key: fs.readFileSync("cert/key.pem").toString(),
  certificate: fs.readFileSync("cert/cert.pem").toString(),
  assert_endpoint: url + "/assert"
};
var sp = new saml2.ServiceProvider(sp_options);

var idp_options = {
  sso_login_url: "https://w3id.alpha.sso.ibm.com/auth/sps/samlidp/saml20/logininitial?RequestBinding=HTTPPost&PartnerId=https://sdl.mybluemix.net/metadata.xml&NameIdFormat=email&Target=https://sdl.mybluemix.net",
  certificates: fs.readFileSync("cert/w3id.sso.ibm.com").toString()
};
var idp = new saml2.IdentityProvider(idp_options);





fs.stat('./vcap-local.json', function (err, stat) {
    if (err && err.code === 'ENOENT') {
        // file does not exist
        console.log('No vcap-local.json');
        initializeAppEnv();
    } else if (err) {
        console.log('Error retrieving local vcap: ', err.code);
    } else {
        vcapLocal = require("./vcap-local.json");
        console.log("Loaded local VCAP", vcapLocal);
        appEnvOpts = {
            vcap: vcapLocal
        };
        initializeAppEnv();
    }
});


// get the app environment from Cloud Foundry, defaulting to local VCAP
function initializeAppEnv() {
    appEnv = cfenv.getAppEnv(appEnvOpts);
    if (appEnv.isLocal) {
        require('dotenv').load();
    }
    if (appEnv.services.cloudantNoSQLDB) {
        initCloudant();
    } else {
        console.error("No Cloudant service exists.");
    }
}



// =====================================
// CLOUDANT SETUP ======================
// =====================================
var dbname = "sdl_db";
var database;

function initCloudant() {
    var cloudantURL = appEnv.services.cloudantNoSQLDB[0].credentials.url || appEnv.getServiceCreds("min-saude-cloudantNoSQLDB").url;
    var Cloudant = require('cloudant')({
        url: cloudantURL,
        plugin: 'retry',
        retryAttempts: 10,
        retryTimeout: 500
    });
    // Create the accounts Logs if it doesn't exist
    Cloudant.db.create(dbname, function (err, body) {
        if (err && err.statusCode == 412) {
            console.log("Database already exists: ", dbname);
        } else if (!err) {
            console.log("New database created: ", dbname);
        } else {
            console.log('Cannot create database!');
        }
    });
    database = Cloudant.db.use(dbname);

}
// =============================
// CLOUDANT METHODS=============
//==============================

app.get('/getProjects', function(req, res){
  res.setHeader('content-type', 'application/json');
  name = (req.query.name) ? req.query.name.toLowerCase() : null;
  documento = (req.query.list) ? req.query.list.toLowerCase() : null;
  attribute = (req.query.list === "Catalogo") ? 'Part Number Description' : (req.query.list === "Deployment") ? 'Part Description' : null;
  if(name === null || documento === null || attribute === null){
    res.status(400).json({
      error: true,
      statusCode: 400,
      message: "Bad Request"
    })
  } else {
  database.get(documento, {
    revs_info:true
  }, function (err,doc){
    if(err){
      console.log(err);
      res.status(400).json({
        error: true,
        statusCode: 400,
        message: "Nao foi possivel pegar o documento"
      });
    } else {
      var projects = [];
      for(var i of doc.projects){
        if(i[attribute].toLowerCase().indexOf(name) != -1){
          var projeto = {
            'Part Number': i['Part Number'],
            'Part Description': i[attribute],
            'Quantity': i['Quantity']
          }
          projects.push(projeto);
        }
      }
      res.status(200).json({
        error: false,
        statusCode: 200,
        quantity: projects.length,
        documento,
        projects
      });
    }
  });
}
});


// =====================================
// WATSON CONVERSATION  ================
// =====================================
app.post('/api/watson', function (req, res) {
    processChatMessage(req, res);
}); // End app.post
function processChatMessage(req, res) {
    chatbot.sendMessage(req, function (err, data) {
        if (err) {
            console.log("Error in sending message: ", err);
            res.status(err.code || 500).json(err);
        }
        else {
            var context = data.context;
            res.status(200).json(data);
        }
    });
}





// ------ Define express endpoints ------

// Endpoint to retrieve metadata
app.get("/metadata.xml", function (req, res) {
  res.type('application/xml');
  res.send(sp.create_metadata());
});


app.get('/', function(req,res){
    res.render('login.html');
})
// Starting point for login
app.get("/login", function (req, res) {
  //console.log(idp);
  sp.create_login_request_url(idp, {}, function (err, login_url, request_id) {
    if (err != null)
      return res.send(500);
    console.log(login_url);
    res.redirect(login_url);
  });
  // res.render('auth.html', {data: {firstName: "Gabriel", lastName: "Marote", blueGroups:[{name: "SDLGroup"}]}})
});


app.get('/home', function(req,res){
    res.render('index.html');
})


// Assert endpoint for when login completes
app.post("/assert", function (req, res) {

  var options = { request_body: req };
  var response = req.body.SAMLResponse || req.body.SAMLRequest;

  // var saml2FJ = saml2FJ.toFilteredJSON(response);

  saml2FJ.toFiltredJSON(response, function (data) {
    res.render('auth.html', {data: data});
  })
  // var parser = new Saml2js(response)
  // var decodedData = base64.decode(response);

});




app.get('/', function (req, res) {
  res.render('index.html');
})



// start server on the specified port and binding host
http.createServer(app).listen(app.get('port'), '0.0.0.0', function () {
  // print a message when the server starts listening
  console.log("server starting on " + app.get('port'));
});
