This is a userscript intended to be run on OWOT (ourworldoftext.com) that makes a radio-like form on the canvas at the initial position of your cursor. **(If your cursor is not on the canvas, server.js will fail to run.)**
It works by sending out *cmds* that signal a seek (manual change of progress), video change, or a pause. It also pings back clients when they first connect, giving them the current video and progress.
Listeners are detected by this initial ping, and afterwards they have a 2-second period every 10 seconds to respond when a listener check is being performed. If they do not respond, the listener is considered disconnected.

Before running server.js, **it is required to run utilities.js.** Not everything in utilities.js is needed for server.js since utilities.js is a general-purpose OWOT module not designed specifically for server.js.

Both client.js and server.js use YouTube Data API v3; credits to Google!
