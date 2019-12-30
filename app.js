require( './db' );
const path = require("path");
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);

//Perform initial setup 
app.set('view engine', 'hbs'); //Configure Handlebars
app.set('views', __dirname + '/views'); 
app.use(express.static(path.join(__dirname, 'public'))); //Serve static files
app.use(express.urlencoded({ extended: false })); //Activate body parsing middleware, allow access of request body
const sessionOptions = { 
	secret: 'secret', 
	saveUninitialized: false, 
	resave: false 
};
app.use(session(sessionOptions)); //Initialize session
const Message = mongoose.model('Message');
const Chatroom = mongoose.model('Chatroom');

//Route handling for the main page to redirect to the chat making page
app.get('/', (req, res) => {
	res.redirect('/make');
});

//Route handling for the page to create a chat
app.get('/make', (req, res) => {
	res.render('make');
});

//Route handling for chat directory page
app.get('/chat', (req, res) =>{
	Chatroom.find({}, (err, chats) => {
		if(err !== null){
			console.log("Error:", err);
		}
		else{
			res.render('chat', {chats: chats});
		}
	});
});

//Route handling for slugs
app.get('/chat/:cName', (req, res) => {
	const chatName = req.params.cName;
	const byUser = req.query.userQ;
	const withMsg = req.query.msgQ;
	Chatroom.countDocuments({cName: chatName}, (err, count) => {
		if(count === 0){
			console.log("Chat does not exist.");
			res.redirect('/make');
		}
		else{
			res.render('room', {cName: chatName, userFilter: byUser, msgFilter: withMsg});
		}
	});
});

//Handle post requests to make a new chat
app.post('/make', (req, res) =>{
	const chatName = req.body.cName;
	const newChat = new Chatroom({
		cName: chatName,
		messages: []
	});
	//Handle input errors: chat can not already exist and form can not be left blank
	Chatroom.countDocuments({cName: chatName}, (err, count) =>{
		if((count === 0) && (chatName !== '')){
			newChat.save((err) => {
				if(err !== null){
					console.log("Error:", err);
				}
				else{
					res.redirect('/chat');
				}
			});
		}
		else{
			console.log("Chat already exists or form was blank.");
			res.redirect('/make');
		}
	});
});

server.listen(process.env.PORT || 3000);

class mongoSearch{
	constructor(cName){
		this.cName = cName;
	}
	setUser(user){
		this.user = user;
	}
	setMsg(msg){
		this.content = {$regex: msg.replace(/&lt;/g, '<').replace(/&gt;/g, '>') , $options: 'i' };
	}
}

class timeString{
	constructor(dateObj){
		let hr = dateObj.getHours().toString();
		let min = dateObj.getMinutes().toString();
		let amOrPm = "AM";
		if(parseInt(min) < 10){
			min = "0" + min;
		}
		if(parseInt(hr) > 12){
		    hr = (parseInt(hr) - 12).toString();
		    if(parseInt(hr) < 10){
		    	hr = "0" + hr;
		    }
		    amOrPm = "PM";
		}
		this.timeStr = hr + ":" + min + " " + amOrPm;
	}
}

io.on('connection', socket =>{
	
	//Put user in socketio room and get messages from database
	socket.on('joinChat', (cName, userFilter, msgFilter)=>{
		socket.join(cName);
		console.log('user connected');
		const searchObj = new mongoSearch(cName);
		const byUser = userFilter;
		const withMsg = msgFilter;
		if(byUser !== ""){
			searchObj.setUser(byUser);
		}
		if(withMsg !== ""){
			searchObj.setMsg(withMsg);
		}
		Message.find(searchObj).sort({_id:1}).lean().exec((err, messages) => {
			if(err !== null){
				console.log(err);
			}
			else{
				socket.emit('showOldMsgs', messages);
			}
		});
	});

	//Handle message sending
	socket.on('sendMsg', (cName, data) =>{
		const userName = data.user;
		const message = data.message;

		if((userName === '') || (message === '')){
			console.log('Invalid message. No user name or no message content.')
		}
		else{
			const date = new Date();
			const timeStringObj = new timeString(date);
			const currTime = timeStringObj.timeStr;
			const newMessage = new Message({
				user: userName,
				content: message,
				time: currTime,
				cName: cName
			});
			newMessage.save((err) => {
				if(err !== null){
					console.log(err);
				}
				else{
					io.to(cName).emit('displayNewMsg', userName, message, currTime);
				}
			});
		}
	});

	//Handle disconnect
	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
});