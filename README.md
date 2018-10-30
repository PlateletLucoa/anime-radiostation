# anime-radiostation
>**NOTE:** It's been a while since I last worked on this project. I've learned a lot more since then and now that I look through my old code I see so much stuff I can work on, fixing stuff and improving things. Sadly I'm a bit busy with IRL matters atm but when things settle down I'd love to give this project an overhaul with React and Node, especially getting rid of those modals and making it a true single-page application. Cheers! :) 

A web application for an anime radio station, based on LISTEN.moe. It plays a raw audio stream on the site and connects to LISTEN.moe's WebSocket to retrieve data about the current song playing, artist for that song and the song duration. The last one mentioned is used to calculate how much of a song has played and is displayed in form of a progress bar.

The progress bar has been turned off on iOS devices as there's currently no way of calculating the song length percentage with the fallback stream.

Confirmed working on Chrome (PC), Android (with Chrome as browser) and iPhone. I recommend using Chrome to run this application.

Currently doesn't work on Internet Explorer. It runs on Microsoft Edge and Firefox albeit very buggy, i.e. the progressbar doesn't behave properly. You can play audio on the latter two but the play/pause button can randomly get stuck.
