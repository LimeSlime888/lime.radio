server.js is a userscript intended to be run on OWOT (ourworldoftext.com) that makes a radio-like form on the canvas and lets clients listen into a YouTube video at the same time as the broadcaster by running client.js.
It works by sending out *cmds* that signal a seek (manual change of progress), video change, or a pause. It also pings back clients when they connect, giving them the current video and progress.
Listeners are detected by this initial ping, and afterwards they have a 2-second period every 10 seconds to respond when a listener check is being performed. If they do not respond, the listener is considered disconnected.

Before running server.js, **it is required to run utilities.js.** Not everything in utilities.js is needed for server.js since utilities.js is a general-purpose OWOT module not designed specifically for server.js.
**When loading a playlist by its ID,** if you are intending to accept requests, **please press the "Play requests next in playlist" menu option even if there are no requests**, or adding requests to the playlist will not work the first time.

Both client.js and server.js use YouTube Data API v3; credits to Google!
