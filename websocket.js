const jwt = null; // Or the user's saved JWT, in this case we don't have one
let ws;

// Global variables for the duration of the current song that is playing
var currentSongDuration;
var tempSongDuration;

class SocketConnection {
	constructor() {
		this.sendHeartbeat = null;
		this.websocketConnection();
	}

	heartbeat(websocket, ms) {
		this.sendHeartbeat = setInterval(() => {
			websocket.send(JSON.stringify({ op: 9 }));
		}, ms);
	}

	websocketConnection() {
		if (ws) {
			ws.close();
			ws = null;
		}
		ws = new WebSocket('wss://listen.moe/gateway');
		ws.onopen = () => {
			clearInterval(this.sendHeartbeat);
			const token = jwt ? `Bearer ${jwt}` : '';
			ws.send(JSON.stringify({ op: 0, d: { auth: token } }));
		};
		ws.onmessage = message => {
			if (!message.data.length) return;
			try {
				var response = JSON.parse(message.data);
			} catch (error) {
				return;
			}
			if (response.op === 0) return this.heartbeat(ws, response.d.heartbeat);
			if (response.op === 1) {
				if (response.t !== 'TRACK_UPDATE'
				&& response.t !== 'TRACK_UPDATE_REQUEST'
				&& response.t !== 'QUEUE_UPDATE') return;

				const data = response.d;

				// Set artist and song title in the HTML
				document.getElementById("now-playing").innerHTML = data.song.title;
				if(data.song.artists[0].nameRomaji != null){
					document.getElementById("artist").innerHTML = data.song.artists[0].nameRomaji;
				}else{
					document.getElementById("artist").innerHTML = data.song.artists[0].name;
				}

				// Change website title when a song plays
				if(data.song.title !== null && data.song.artists[0].nameRomaji !== null){
					document.title = data.song.title + " by " + data.song.artists[0].nameRomaji + " | Anone, anone! ~";
				}else if(data.song.title !== null && data.song.artists[0].name !== null){
					document.title = data.song.title + " by " + data.song.artists[0].name + " | Anone, anone! ~";
				}else if(data.song.title !== null){
					document.title = data.song.title + " | Anone, anone! ~";
				}else{
					document.title = "Anone, anone! ~";
				}

				// Initialize variables for the progressbar to work
				currentSongDuration = data.song.duration;
				if(tempSongDuration === undefined){
					tempSongDuration = data.song.duration;
				}
				
			}
		};
		ws.onclose = err => {
			if (err) {
				clearInterval(this.sendHeartbeat);
				if (!err.wasClean) setTimeout(() => this.websocketConnection(), 5000);
			}
			clearInterval(this.sendHeartbeat);
		};
	}
}

const socket = new SocketConnection();

// Wait until document has finished loading before initializing our variables
document.addEventListener("DOMContentLoaded", function() { startplayer(); }, false);

// Variables for checking if user navigated from iOS or iOS-Safari
var ua = window.navigator.userAgent;
var iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
var webkit = !!ua.match(/WebKit/i);
var iOSSafari = iOS && webkit && !ua.match(/CriOS/i);

// URL link to the raw audio stream, declared outside function so it becomes global
var OriginalSourceUrl = "";

function startplayer(){
	player = document.getElementById("music-player");

	// Music player controls
	volumeSlider = document.getElementById("volumeSlider");
	// Get the saved value of the volume control
	volumeSlider.value = getSavedValue("volumeSlider");
	changeVolBarColor();
	change_vol();

	mute = document.getElementById("mute");
	muteIcon = document.getElementById("muteIcon");

	playPauseIcon = document.getElementById("playPauseIcon");

	// Used by the music progressbar
	progressBar = document.getElementById("progress");
	tempSongDuration = currentSongDuration;

	// Used for stopping and resuming the audio stream
	audioSourceElement = document.querySelector("#audioSource");
	originalSourceUrl = "https://listen.moe/stream";

	// if iOS then we'll have to use the fallback audio stream as OGG format is not supported there
	if(iOS || iOSSafari){
		originalSourceUrl = "https://listen.moe/fallback";
		audioSourceElement.setAttribute("src", originalSourceUrl);
		audioSourceElement.setAttribute("type", "audio/mp3");
		audioSourceElement.removeAttribute("codecs");
		player.setAttribute("preload", "none");
		player.load();
	}
}

// Music player functions
function playPause() {
	if(player.currentTime > 0 && !player.paused && !player.ended && player.readyState > 2){
		pause_aud();
		playPauseIcon.setAttribute("class", "fas fa-play");
	}else{
		play_aud();
		playPauseIcon.setAttribute("class", "fas fa-pause");
	}
}

function play_aud() {
	if(!audioSourceElement.getAttribute("src")){
		audioSourceElement.setAttribute("src", originalSourceUrl);
		player.load();
	}
	player.play();
}

function pause_aud() {
	audioSourceElement.setAttribute("src","");
	player.pause();
	setTimeout(function() {
		player.load();
	});
}

function mute_vol() {
	if(player.muted){
		player.muted = false;
		muteIcon.setAttribute("class","fas fa-volume-up");
	}else{
		player.muted = true;
		muteIcon.setAttribute("class","fas fa-volume-off");
	}
}

function change_vol() {
	player.volume = volumeSlider.value;
}

// Used when the stored value is loaded
function changeVolBarColor() {
		var string1 = "linear-gradient(to right, #ff015b 0%, #ff015b ";
		var string2 = "%, #fff ";
		var string3 = "%, #fff 100%)";
		var combinedString = string1 + volumeSlider.value*100 + string2 + volumeSlider.value*100 + string3;
		volumeSlider.style.background = combinedString;
}

// Functions for remembering what volume value the user has setted
function saveValue(e) {
	var id = e.id; // get the sender's id to save it
	var val = e.value; // get the value
	localStorage.setItem(id, val); // Everytime the volume changes, save the value
}

// Return the value of "v" from localStorage
function getSavedValue(v) {
	if (localStorage.getItem(v) === null){
		return "0.7"; // default value
	}
	return localStorage.getItem(v);
}

// Code for the progressbar to work below
var updateInterval = setInterval(playerHeartbeat, 50);

var unknownSongPlayed = false;

function playerHeartbeat() {

	// If currentSongDuration isn't defined yet then the music player hasn't started playing (or hasn't fully loaded), 
	// currentSongDuration === 0 means that the current song has an unknown length
	if(!(iOS || iOSSafari) && currentSongDuration !== undefined && !(currentSongDuration === 0)){

		// Reset if an song with unknown length (currentSongDuration === 0) finished playing AND the music player is currently playing
		// Remove the playerIsPlaying check to enable autoplay (have no idea why this works)
		if(unknownSongPlayed && player.currentTime > 0 && !player.paused && !player.ended && player.readyState > 2){
			// Adding a 5 second delay before reloading audio to make transition smoother
			setTimeout(function() {
				document.getElementById("progress").style.width = "0%";
				pause_aud();
				player.currentTime = 0;
				setTimeout(function() {
					play_aud();
				}, 150);
				tempSongDuration = currentSongDuration;
			}, 5000);
		}

		unknownSongPlayed = false;

		// Calculate the percentage of a songs duration
		var num = (player.currentTime / tempSongDuration) * 100;
		var n = num.toString();
		progressBar.style.width = n + "%";

		// Reset if we go over or reach the end of a songs duration 
		if(player.currentTime > currentSongDuration && currentSongDuration === tempSongDuration){
			document.getElementById("progress").style.width = "0%";
			pause_aud();
			player.currentTime = 0;
			setTimeout(function() {
				play_aud();
			}, 150);
		}

		// Reset if song duration changes, which means a new song is playing, AND when the previous song has fully played out
		if(tempSongDuration !== currentSongDuration && player.currentTime >= tempSongDuration){
			document.getElementById("progress").style.width = "0%";
			pause_aud();
			player.currentTime = 0;
			setTimeout(function() {
				play_aud();
			}, 150);
			tempSongDuration = currentSongDuration;
		}

	// Error handling in case something unexpected happens
	}else{
		document.getElementById("progress").style.width = "100%";
		unknownSongPlayed = true;
	}
}
