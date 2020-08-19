window.onload = function(){
    const socket = io('http://localhost:3000'); //NOTE: URL CHANGES FOR DEPLOYMENT! LOCALHOST FOR TESTING PURPOSES ONLY
	const msgForm = document.getElementById('sendMsg');
	const msgContent = document.getElementById('messageContent');
	const username = document.getElementById('username');
	const msgList = document.getElementById('messages');

	function forEachMsg(arr, action) { //Write our own version of forEach
		for (let i = 0; i < arr.length; i++) {
			action(arr[i].usern, arr[i].msgcontent, arr[i].timesent, arr[i].id); 
		}
	}

	function addMessage(user, messageStr, time, id){
		const msgElem = document.createElement('div');
		const msgTitle = document.createElement('div');
		const msgTime = document.createElement('div');
		const msgText = document.createElement('div');
		const msgDelete = document.createElement('form');
		const delButton = document.createElement('button');
		const date = new Date(time);
		const timeStr = date.toLocaleTimeString() + " on " + date.toLocaleDateString();
		msgElem.classList.add("mt-2");
		msgElem.classList.add("mb-2");
		msgTitle.classList.add("msgName");
		msgTime.classList.add("msgTime");
		msgText.classList.add("msgText");
		msgDelete.classList.add("msgDelete");
		msgTitle.innerText = user;
		msgTime.innerText = timeStr;
		msgText.innerText = messageStr;
		msgDelete.method = "POST";
		msgDelete.action = "/chat/" + cName;
		delButton.innerText = "X";
		delButton.classList.add("delButton");
		delButton.type = "submit";
		delButton.value = id;
		delButton.name = "id"; 
		msgDelete.append(delButton);
		msgElem.append(msgTitle);
		msgElem.append(msgTime);
		msgElem.append(msgDelete);
		msgElem.append(msgText);
		msgList.append(msgElem);
		const messageBody = msgList;
		messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight; //scrolls to bottom
	}

	socket.emit('joinChat', cName, userFilter, msgFilter);

	socket.on('displayNewMsg', (user, message, time, id) => {
		addMessage(user, message, time, id);
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