# anime-radiostation
A web application for an anime radio station, based on LISTEN.moe. It plays a raw audio stream on the site and connects to LISTEN.moe's WebSocket to retrieve data about the current song playing, artist for that song and the song duration. The last one mentioned is used to calculate how much of a song has played and is displayed in form of a progress bar.

The progress bar has been turned off on iOS devices as there's currently no way of calculating the song length percentage with the fallback stream.

Confirmed working on Chrome (PC), Android (with Chrome as browser) and iPhone (finally fixed it! press the play/pause a few times if no audio plays, or wait until it loads). I recommend using Chrome to run this application.

Currently doesn't work on Internet Explorer. It runs on Microsoft Edge and Firefox albeit very buggy, i.e. the progressbar doesn't behave properly. You can play audio on the latter two but the play/pause button can randomly get stuck.
