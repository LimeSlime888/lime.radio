radiocontain = document.createElement("span");
radiocontain.style.top = "0";
radiocontain.style.position = "absolute";
radiocontain.style.padding = "4px 4px 48px";
radiocontain.style.background = "#00bcf1";
west_gui.style.zIndex = 1;
ytdrag = draggable_element(radiocontain);
document.body.appendChild(radiocontain);
var ytPaused;
var currentVideo = "ci5MzuiXBJA";
var listeningTo = "lime.owot";
w.showChat();
alert("if you're not listening to 'lime.owot', do /radio in the chatbox and then the username shown after 'host:' on the radio (yes, nothing being there is intentional)");
client_commands.radio = e=>{listeningTo=e[0];reping()}
w.broadcastReceive(1);
function reping() {
    let once;
    w.on("cmd", once = async function(e){
        if ((e.username ?? "") != listeningTo) return;
        if (!e.data.startsWith("limeradio_pong ")) return;
        w.off("cmd", once);
        let [id, time, pause] = e.data.slice(15).split(" ");
        time = Number(time);
        changeVideo(id);
        await new Promise(r=>setTimeout(r, 1500));
        ytobject.seekTo(time+1.5);
    });
    network.cmd("limeradio_ping "+listeningTo, true);
}
var audioPlayer = new Audio;
audioPlayer.controls = true;
audioPlayer.style.display = "none";
radiocontain.appendChild(audioPlayer);
// [ytID]
// src:[url]
async function loadPlayer(){
    if (window.player) player.remove();
    player = document.createElement("div");
    player.id = "player";
    radiocontain.appendChild(player);
    ytobject = new YT.Player("player", {
        height: '270',
        width: '480',
        videoId: currentVideo,
        enablejsapi: '1',
        events: {
            onReady: e=>e.target.playVideo()
        }
    });
    player.remove();
    player = ytobject.g;
    await new Promise(async function(r){
        while (true) {
            await new Promise(r=>setTimeout(r, 200));
            if (ytobject.loadVideoById) return r();
        }
    });
    reping();
}
w.loadScript("https://www.youtube.com/player_api", async function(){
    await new Promise(async function(r){
        while (true) {
            await new Promise(r=>setTimeout(r, 200));
            if (YT.Player) return r();
        }
    });
    loadPlayer();
});
async function fadeOutYT() {
    ytobject.stopVideo();
    audioPlayer.style.display = "block";
    audioPlayer.style.opacity = 0;
    player.style.opacity = 1;
    while (!(audioPlayer.style.opacity == 1 && player.style.opacity == 0)) {
        player.style.opacity = Math.max(0, +player.style.opacity - 1/128);
        audioPlayer.style.opacity = Math.min(1, +audioPlayer.style.opacity + 1/128)
        if (player.style.opacity <= 0) { player.style.display = "none" }
        if (audioPlayer.style.opacity >= 1) { audioPlayer.style.opacity = 1 }
        await new Promise(r=>setTimeout(r, 10));
    }
}
async function fadeOutAudio() {
    audioPlayer.pause();
    player.style.display = "";
    player.style.opacity = 0;
    audioPlayer.style.opacity = 1;
    while (!(player.style.opacity == 1 && audioPlayer.style.opacity == 0)) {
        audioPlayer.style.opacity = Math.max(0, +audioPlayer.style.opacity - 1/128);
        player.style.opacity = Math.min(1, +player.style.opacity + 1/128)
        if (audioPlayer.style.opacity <= 0) { audioPlayer.style.display = "none" }
        if (player.style.opacity >= 1) { player.style.opacity = 1 }
        await new Promise(r=>setTimeout(r, 10));
    }
}
async function changeVideo(id="ci5MzuiXBJA") {
    if (id == currentVideo) {
        if (currentVideo.startsWith("src:")) { audioPlayer.currentTime = 0; audioPlayer.play() }
        else { ytobject.seekTo(0) }
        return
    } else if (id.startsWith("src:")) {
        if (!currentVideo.startsWith("src:")) { fadeOutYT() }
        audioPlayer.currentTime = 0; audioPlayer.src = id.slice(4); audioPlayer.play();
    } else {
        if (currentVideo.startsWith("src:")) { fadeOutAudio() }
        ytobject.loadVideoById(id)
    }
    currentVideo = id;
}
w.on("socketOpen", socket.onopen);
w.on("socketOpen", ()=>reping());
socket.onopen = ()=>w.emit("socketOpen");
w.on("cmd", function(e){
    if ((e.username ?? "") != listeningTo) return;
    if (!e.data.startsWith("limeradio_")) return;
    let cmd = e.data.slice(10).split(" ");
    if (cmd[0] == "change") { changeVideo(cmd[1]) }
    else if (cmd[0] == "seek") { ytobject.seekTo(Number(cmd[1]));ytobject.playVideo() }
    else if (cmd[0] == "seekpause") { ytobject.seekTo(Number(cmd[1]));ytobject.pauseVideo() }
    else if (cmd[0] == "pause") { ytobject.pauseVideo() }
    else if (cmd[0] == "check") { network.cmd("limeradio_here") }
});
menu.addOption("Request a video!", function(){
    let id = prompt("gimme video id...");
    if (!id) return;
    network.cmd("limeradio_request "+id+" "+listeningTo, true);
});
menu.addOption("Request multiple videos!?", async function(){
    let id = prompt("gimme video ids and separate with comma no space...!", "id,id2,id3");
    if (!id) return;
    let ids = id.split(",");
    for (let i of ids) {
        network.cmd("limeradio_request "+id+" "+listeningTo, true);
        await new Promise(r=>setTimeout(r, 200));
    }
});
menu.addCheckboxOption("Hide video", ()=>radiocontain.style.display="none", ()=>radiocontain.style.display="");
w.doAnnounce("You can request and hide the video through the menu.");
