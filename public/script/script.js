window.onload = function(){
    const socket = io('http://localhost:3000'); //NOTE: URL CHANGES FOR DEPLOYMENT! LOCALHOST FOR TESTING PURPOSES ONLY
	const msgForm = document.getElementById('sendMsg');
	const msgContent = document.getElementById('messageContent');
	const username = document.getElementById('username');
	const msgList = document.getElementById('messages');

	function forEachMsg(arr, action) { //Write our own version of forEach
		for (let i = 0; i < arr.length; i++) {
			action(arr[i].user, arr[i].content, arr[i].time); 
		}
	}

	function addMessage(user, messageStr, time){
		const msgElem = document.createElement('div');
		const formattedMsg = "[" + time + "] " + user + ": " + messageStr; 
		msgElem.innerText = formattedMsg;
		msgList.append(msgElem);
		const messageBody = msgList;
		messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight; //scrolls to bottom
	}

	socket.emit('joinChat', cName, userFilter, msgFilter);

	socket.on('displayNewMsg', (user, message, time) => {
		addMessage(user, message, time);
	});

	socket.on('showOldMsgs', (messages) => {
		/*messages.forEach((message) => {
			addMessage(message.user, message.content, message.time);
		});*/
		forEachMsg(messages, addMessage);
	});

	msgForm.addEventListener('submit', event => {
		const msgString = msgContent.value;
		const data = {
			user: username.value,
			message: msgString
		};
		event.preventDefault();
		socket.emit('sendMsg', cName, data);
		msgContent.value = '';
	});
}