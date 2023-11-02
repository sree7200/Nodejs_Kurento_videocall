// getting dom elements
var divRoomSelection = document.getElementById('roomSelection');
var divMeetingRoom = document.getElementById('meetingRoom');
var inputRoom = document.getElementById('room');
var inputName = document.getElementById('name');
var btnRegister = document.getElementById('register');

// variables
var roomName;
var userName;
var participants = {};

// Let's do this
var socket = io();
btnRegister.onclick = function() {
	roomName = inputRoom.value;
	userName = inputName.value;

	if (roomName === '' || userName === '') {
		alert('Room and Name are required!');
	} else {
		var message = {
			event: 'joinRoom',
			userName: userName,
			roomName: roomName
		};
		sendMessage(message);
		divRoomSelection.style.display = 'none';
		divMeetingRoom.style.display = 'block';
	}
};

socket.on('message', (message) => {
	console.log('Message received: ' + message.event);

	switch (message.event) {
		case 'newParticipantArrived':
			receiveVideo(message.userid, message.username);
			break;
		case 'existingParticipants':
			onExistingParticipants(message.userid, message.existingUsers);
			break;
		case 'receiveVideoAnswer':
			onReceiveVideoAnswer(message.senderid, message.sdpAnswer);
			break;
		case 'candidate':
			addIceCandidate(message.userid, message.candidate);
			break;
	}
});

function receiveVideo(userid, username) {
	var video = document.createElement('video');
	video.id = userid;
	video.autoplay = true;
	var div = document.createElement('div');
	div.className = 'videoContainer';
	var name = document.createElement('div');
	name.appendChild(document.createTextNode(username));
	div.appendChild(video);
	div.appendChild(name);
	divMeetingRoom.appendChild(div);

	var user = {
		id: userid,
		username: username,
		video: video,
		rtcPeer: null
	};

	participants[user.id] = user;

	var options = {
		remoteVideo: video,
		onicecandidate: onIceCandidate,
		iceServers: [
			{ urls: 'stun:40.68.138.182:3478' } // Replace with your STUN server's IP address and port
		]
	};

	user.rtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function(err) {
		if (err) {
			return console.error(err);
		}
		this.generateOffer(onOffer);
	});

	var onOffer = function(err, offer, wp) {
		console.log('sending offer');
		var message = {
			event: 'receiveVideoFrom',
			userid: user.id,
			roomName: roomName,
			sdpOffer: offer
		};
		sendMessage(message);
	};

	function onIceCandidate(candidate, wp) {
		console.log('sending ice candidates');
		var message = {
			event: 'candidate',
			userid: user.id,
			roomName: roomName,
			candidate: candidate
		};
		sendMessage(message);
	}
}

function onExistingParticipants(userid, existingUsers) {
	var video = document.createElement('video');
	var div = document.createElement('div');
	div.className = 'videoContainer';
	var name = document.createElement('div');
	video.id = userid;
	video.autoplay = true;
	name.appendChild(document.createTextNode(userName));
	div.appendChild(video);
	div.appendChild(name);
	divMeetingRoom.appendChild(div);

	var user = {
		id: userid,
		username: userName,
		video: video,
		rtcPeer: null
	};

	participants[user.id] = user;

	var constraints = {
		audio: true,
		video: {
			mandatory: {
				maxWidth: 320,
				maxFrameRate: 15,
				minFrameRate: 15
			}
		}
	};

	var options = {
		localVideo: video,
		mediaConstraints: constraints,
		onicecandidate: onIceCandidate,
		iceServers: [
			{ urls: 'stun:40.68.138.182:3478' },
			{ urls: 'stun:stun.l.google.com:19302' } // Replace with your STUN server's IP address and port
		]
	};

	user.rtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function(err) {
		if (err) {
			return console.error(err);
		}
		this.generateOffer(onOffer);
	});

	existingUsers.forEach(function(element) {
		receiveVideo(element.id, element.name);
	});

	var onOffer = function(err, offer, wp) {
		console.log('sending offer');
		var message = {
			event: 'receiveVideoFrom',
			userid: user.id,
			roomName: roomName,
			sdpOffer: offer
		};
		sendMessage(message);
	};

	function onIceCandidate(candidate, wp) {
		console.log('sending ice candidates');
		var message = {
			event: 'candidate',
			userid: user.id,
			roomName: roomName,
			candidate: candidate
		};
		sendMessage(message);
	}
}

function onReceiveVideoAnswer(senderid, sdpAnswer) {
	participants[senderid].rtcPeer.processAnswer(sdpAnswer);
}

function addIceCandidate(userid, candidate) {
	participants[userid].rtcPeer.addIceCandidate(candidate);
}

function sendMessage(message) {
	console.log('sending ' + message.event + ' message to server');
	socket.emit('message', message);
}
