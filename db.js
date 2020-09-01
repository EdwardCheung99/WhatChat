// NOTE: THIS IS PREVIOUS CODE FROM WHEN THIS APP USED MONGODB. 








// 3RD DRAFT DATA MODEL
const mongoose = require('mongoose');

// a message in a chatroom
// * content of the message is a string
// * messages can be deleted if the currently logged in username matches the message's 'user' field
// * time represents the time the message was sent in HR:MIN:SEC
// * cName corresponds to the name of the chat the message belongs to
const Message = new mongoose.Schema({
  user: String,
  content: String,
  time: String,
  cName: String
});

// a chatroom
// * cName represents the name of the chatroom as a string
const Chatroom = new mongoose.Schema({
  cName: String
});

// Use schema to define model 
mongoose.model('Message', Message); 
mongoose.model('Chatroom', Chatroom); 

// is the environment variable, NODE_ENV, set to PRODUCTION? 
let dbconf;
if (process.env.NODE_ENV === 'PRODUCTION') {
 // if we're in PRODUCTION mode, then read the configration from a file
 // use blocking file io to do this...
 const fs = require('fs');
 const path = require('path');
 const fn = path.join(__dirname, '/config.json');
 const data = fs.readFileSync(fn);

 // our configuration file will be in json, so parse it and set the
 // conenction string appropriately!
 const conf = JSON.parse(data);
 dbconf = conf.dbconf;
} else {
 // if we're not in PRODUCTION mode, then use
 dbconf = 'mongodb://localhost/finalproj';
}

mongoose.connect(dbconf, {useNewUrlParser: true, useUnifiedTopology: true});
