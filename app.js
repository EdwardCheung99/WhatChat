require( './db' );
require('dotenv').config();
const path = require("path");
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const postgres = require('pg');
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
const pgConnect = process.env.PG_CONNECT;
const pgPool = new postgres.Pool({connectionString: pgConnect});

//Route handling for the main page to redirect to the chat making page
app.get('/', (req, res) => {
	res.redirect('/chat');
});

//Route handling for the page to create a chat
app.get('/make', (req, res) => {
	res.render('make');
});

//Route handling for chat directory page
app.get('/chat', (req, res) =>{
	let queryString = "SELECT cname FROM chatroom ";
	if (req.query.cName) queryString += "WHERE cname ILIKE'%" + req.query.cName + "%' ";
	queryString += "ORDER BY nummessages DESC LIMIT 12;";
	pgPool.connect((err, client, done) => {
		if (err) throw err;
		client.query(queryString, (err, pgres) => {
			if (err) {
				return console.error('error running query', err);
			}
			done();
			res.render('chat', {chats: pgres.rows});
		});
	});
	/* mongodb code
	Chatroom.find({}, (err, chats) => {
		if(err !== null){
			console.log("Error:", err);
		}
		else{
			res.render('chat', {chats: chats});
		}
	});
	*/
});

//Route handling for slugs
app.get('/chat/:cName', (req, res) => {
	const chatName = req.params.cName;
	const byUser = req.query.userQ;
	const withMsg = req.query.msgQ;
	let queryString = "SELECT cname FROM chatroom WHERE cname = '" + chatName + "';";
	pgPool.connect((err, client, done) => {
		if (err) throw err;
		client.query(queryString, (err, pgres) => {
			if (err) {
				return console.error('error running query', err);
			}
			done();
			if (pgres.rows.length === 0){
				console.log('Chat does not exist');
				res.redirect('/chat');
			}
			else{
				res.render('room', {cName: chatName, userFilter: byUser, msgFilter: withMsg});
			}
		});
	});
	/* mongodb code
	Chatroom.countDocuments({cName: chatName}, (err, count) => {
		if(count === 0){
			console.log("Chat does not exist.");
			res.redirect('/chat');
		}
		else{
			res.render('room', {cName: chatName, userFilter: byUser, msgFilter: withMsg});
		}
	});
	*/
});

//Handle post requests to make a new chat
app.post('/make', (req, res) =>{
	const chatName = req.body.cName.trim();
	const checkEmpty = chatName.slice(0).replace(/\s+/g, '');
	if (checkEmpty === ''){
		console.log("Form was blank.");
		return res.redirect('/make');
	} 
	pgPool.connect((err, client, done) => {
		if (err) throw err;
		client.query("SELECT cname FROM chatroom WHERE cname LIKE '"+chatName+"';", (err, pgres) => {
			if (err) {
				return console.error('error running query', err);
			}
			if ((pgres.rows.length === 0) && (chatName !== '')){
				let queryString = "INSERT into chatroom (cname, nummessages) VALUES ("+chatName+",0);";
				client.query(queryString, (err, pgres2) => {
					if (err) {
						return console.error('error running query', err);
					}
					done();
					res.redirect('/chat');
				});
			}
			else{
				console.log("Chat already exists.");
				res.redirect('/make');
			}
		});
	});

	/* mongodb code
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
	*/
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
		const byUser = userFilter;
		const withMsg = msgFilter;
		let queryString = "SELECT usern, msgcontent, timeSent FROM message WHERE cname ='" + cName + "'";
		if(byUser !== ""){
			queryString += "AND usern ILIKE '%" + byUser + "%'";
		}
		if(withMsg != ""){
			queryString += "AND msgcontent ILIKE '%" + withMsg + "%'";
		}
		queryString += ";";

		pgPool.connect((err, client, done) => {
			if (err) throw err;
			client.query(queryString, (err, pgres) => {
				if (err) {
					return console.error('error running query', err);
				}
				done();
				socket.emit('showOldMsgs', pgres.rows);
			});
		});
		/* mongodb code
		const searchObj = new mongoSearch(cName);
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
		*/
	});

	//Handle message sending
	socket.on('sendMsg', (cName, data) =>{
		const userName = data.user;
		const message = data.message;
		const currTime = new Date().toUTCString();

		if((userName === '') || (message === '')){
			console.log('Invalid message. No user name or no message content.')
		}
		else{
			let queryString = "INSERT into message (usern, msgcontent, cname, timesent) VALUES ('"+userName+"', '"+message+"', '"+cName+"', NOW());";
			pgPool.connect((err, client, done) => {
				if (err) throw err;
				client.query(queryString, (err, pgres) => {
					if (err) {
						return console.error('error running query', err);
					}
					let queryString2 = "UPDATE chatroom SET nummessages = nummessages + 1 WHERE cname = '" + cName + "';";
					client.query(queryString2, (err, pgres) => {
						if (err) {
							return console.error('error running query', err);
						}
						done();
						io.to(cName).emit('displayNewMsg', userName, message, currTime);
					});
				});
			});

			/* mongodb code
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
			*/
		}
	});

	//Handle disconnect
	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
});