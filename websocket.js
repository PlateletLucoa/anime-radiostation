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

				// Initialize variables for the progressbar to work
				currentSongDuration = data.song.duration;
				if(tempSongDuration === undefined){
					tempSongDuration = data.song.duration;
				}

				// Variables for the tags of current song playing and artist name
				var nowPlaying = document.getElementById("now-playing");
				var artistLbl = document.getElementById("artist");

				// Code for updating the song title
				var hasSongTitle = data.song.title !== undefined && data.song.title !== null;
				var song = "";
				if(hasSongTitle){
					song = data.song.title;

					// Experimental, I'm not 100% sure how data.song.sources work. 
					// UPDATE: sources is an array with Objects, each object have id, name, nameRomaji and image attributes 
					if(data.song.sources.length > 0){
						song += " [";
						for(var i = 0; i < data.song.sources.length; i++){
							var hasSongSourceNameRomaji = data.song.sources[i].nameRomaji !== undefined && data.song.sources[i].nameRomaji !== null;
							var hasSongSourceName = data.song.sources[i].name !== undefined && data.song.sources[i].name !== null;

							if(hasSongSourceNameRomaji){
								song += data.song.sources[i].nameRomaji + ", ";
							}else if(hasSongSourceName){
								song += data.song.sources[i].name + ", ";
							}else{
								song += "No data" + ", ";
							}
						}
						song = song.substr(0, song.length-2);
						song += "]";
					}
				}else{
					song = "No data";
				}
				nowPlaying.innerHTML = song;

				// Code for updating the artist name 
				var artists = "";
				if(data.song.artists.length > 1){
					for(var i = 0; i < data.song.artists.length; i++){
						var hasArtistNameRomaji = data.song.artists[i].nameRomaji !== undefined && data.song.artists[i].nameRomaji !== null;
						var hasArtistName = data.song.artists[i].name !== undefined && data.song.artists[i].name !== null;

						if(hasArtistNameRomaji){
							artists += data.song.artists[i].nameRomaji + ", ";
						}else if(hasArtistName){
							artists += data.song.artists[i].name + ", ";
						}else{
							artists += "No data" + ", ";
						}
					}
					artists = artists.substr(0, artists.length-2);
					artistLbl.innerHTML = artists;
				}else{
					if(data.song.artists[0].nameRomaji !== undefined && data.song.artists[0].nameRomaji !== null){
						artists = data.song.artists[0].nameRomaji;
					}else if(data.song.artists[0].name !== undefined && data.song.artists[0].name !== null){
						artists = data.song.artists[0].name;
					}else{
						artists = "No data";
					}
					artistLbl.innerHTML = artists;
				}
				
				// Change website title to include current playing song + artist
				if(song !== "No data" && artists !== "No data"){
					document.title = song + " by " + artists + " | Anone, anone! ~";
				}else if(song !== "No data"){
					document.title = song + " | Anone, anone! ~";
				}else{
					document.title = "Anone, anone! ~";
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

// Variables for checking if user navigated from iOS or iOS-Safari
var ua = window.navigator.userAgent;
var iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
var webkit = !!ua.match(/WebKit/i);
var iOSSafari = iOS && webkit && !ua.match(/CriOS/i);

// URL link to the raw audio stream, declared outside function so it becomes global
var OriginalSourceUrl = "";

// Wait until document has finished loading before initializing our variables
document.addEventListener("DOMContentLoaded", function() { startplayer(); }, false);

function startplayer(){
	player = document.getElementById("music-player");

	// Volume slider stuff
	volumeSlider = document.getElementById("volumeSlider");
	volumeSlider.value = getSavedValue("volumeSlider");	// Get the saved value of the volume control
	changeVolBarColor();
	change_vol();

	// Music player buttons
	mute = document.getElementById("mute");
	muteIcon = document.getElementById("muteIcon");
	playPauseIcon = document.getElementById("playPauseIcon");

	// Used by the music progressbar
	unknownSongPlayed = false;
	progressBar = document.getElementById("progress");
	tempSongDuration = currentSongDuration;

	// Used for stopping and resuming the audio stream
	audioSourceElement = document.querySelector("#audioSource");
	originalSourceUrl = "https://listen.moe/stream";

	// If iOS then we'll have to use the fallback audio stream as OGG format is not supported on those devices
	if(iOS || iOSSafari){
		originalSourceUrl = "https://listen.moe/fallback";
		audioSourceElement.setAttribute("src", originalSourceUrl);
		audioSourceElement.setAttribute("type", "audio/mp3");
		audioSourceElement.removeAttribute("codecs");
		player.setAttribute("preload", "auto");
		player.load();
	}

	// Start the progressbar function 
	updateInterval = setInterval(playerHeartbeat, 50);

	// If iOS then we don't need to run progressbar function as it doesn't work with fallback audio
	if(iOS || iOSSafari){
		document.getElementById("progress").style.width = "100%";
		clearInterval(updateInterval);
	}
}

// Music player functions
var playPauseBtn = document.querySelector("#playPause");
playPauseBtn.addEventListener("click", function(){
	if(player.currentTime > 0 && !player.paused && !player.ended && player.readyState > 2){
		pause_aud();
		playPauseIcon.setAttribute("class", "fas fa-play");
	}else{
		play_aud();
		playPauseIcon.setAttribute("class", "fas fa-pause");
	}
});

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

var muteBtn = document.querySelector("#mute");
muteBtn.addEventListener("click", function(){
	if(player.muted){
		player.muted = false;
		muteIcon.setAttribute("class","fas fa-volume-up");
	}else{
		player.muted = true;
		muteIcon.setAttribute("class","fas fa-volume-off");
	}
});

function change_vol() {
	player.volume = volumeSlider.value;
}

volumeSlider.addEventListener("input", function(){
	player.volume = volumeSlider.value;
	changeVolBarColor();
	saveValue(volumeSlider);
});

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

// Function for resetting the audio stream so we're in sync with the radio
function resetAudioStream() {
	progressBar.style.width = "0%";
	pause_aud();
	player.currentTime = 0;
	setTimeout(function() {
		play_aud();
	}, 150);
}

// Progressbar update function and player-to-radio synchronization (most important function!)
function playerHeartbeat() {

	// If currentSongDuration isn't defined yet then the music player hasn't started playing (or hasn't fully loaded), 
	// currentSongDuration === 0 means that the current song has an unknown length
	if(currentSongDuration !== undefined && !(currentSongDuration === 0)){

		// Reset if an song with unknown length (currentSongDuration === 0) finished playing AND the music player is currently playing
		// Remove the playerIsPlaying check to enable autoplay (have no idea why this works)
		if(unknownSongPlayed && player.currentTime > 0 && !player.paused && !player.ended && player.readyState > 2){
			// Adding a 2 second delay before reloading audio to make transition smoother (needs finetuning!)
			setTimeout(function() {
				resetAudioStream();
				tempSongDuration = currentSongDuration;
			}, 2000);
		}

		unknownSongPlayed = false;

		// Calculate the percentage of a songs duration
		var num = (player.currentTime / tempSongDuration) * 100;
		var n = num.toString();
		progressBar.style.width = n + "%";

		// Reset if we go over or reach the end of a songs duration 
		if(player.currentTime > currentSongDuration && currentSongDuration === tempSongDuration){
			resetAudioStream();
		}

		// Reset if song duration changes, which means a new song is playing AND when the previous song has fully played out
		if(tempSongDuration !== currentSongDuration && player.currentTime >= tempSongDuration){
			resetAudioStream();
			tempSongDuration = currentSongDuration;
		}
	}
	// Error handling in case something unexpected happens (or if a song with unknown length is playing)
	else{
		progressBar.style.width = "100%";
		unknownSongPlayed = true;
	}
}
