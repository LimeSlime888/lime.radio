ytcontain = document.createElement("span");
ytcontain.style.top = "0";
ytcontain.style.position = "absolute";
ytcontain.style.padding = "4px 4px 48px";
ytcontain.style.background = "#00bcf1";
west_gui.style.zIndex = 1;
ytdrag = draggable_element(ytcontain);
document.body.appendChild(ytcontain);
player = document.createElement("div");
player.id = "player";
ytcontain.appendChild(player);
var listeningTo = prompt("enter broadcaster's username", "lime.owot");
w.broadcastReceive(1);
w.loadScript("https://www.youtube.com/player_api", async function(){
    await new Promise(async function(r){
        while (true) {
            await new Promise(r=>setTimeout(r, 200));
            if (YT.Player) return r();
        }
    });
    ytobject = new YT.Player("player", {
        height: '270',
        width: '480',
        events: {
            onReady: e=>{ network.cmd("limeradio_ping "+listeningTo, true); }
        }
    });
    let once;
    w.on("cmd", once = async function(e){
        if ((e.username ?? "") != listeningTo) return;
        if (!e.data.startsWith("limeradio_pong ")) return;
        w.off("cmd", once);
        let [id, time] = e.data.slice(15).split(" ");
        time = Number(time);
        changeVideo(id);
        await new Promise(r=>setTimeout(r, 500));
        ytobject.seekTo(time);
    });
    window.addEventListener("beforeunload", function(){
        network.cmd("limeradio_byebye "+listeningTo);
    })
    player.remove();
    player = ytobject.g;
});
async function changeVideo(id) {
    if (id == ytobject.getVideoData().video_id) {
        ytobject.seekTo(0);return
    }
    ytobject.loadVideoById(id);
}
w.on("cmd", function(e){
    if ((e.username ?? "") != listeningTo) return;
    if (!e.data.startsWith("limeradio_")) return;
    let cmd = e.data.slice(10).split(" ");
    if (cmd[0] == "change") { changeVideo(cmd[1]) }
    else if (cmd[0] == "seek") { ytobject.seekTo(Number(cmd[1]));ytobject.playVideo() }
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
    ids = ids.split(",");
    for (let i of ids) {
        network.cmd("limeradio_request "+id+" "+listeningTo, true);
        await new Promise(r=>setTimeout(r, 200));
    }
});
menu.addCheckboxOption("Hide video", ()=>ytcontain.style.display="none", ()=>ytcontain.style.display="");
w.doAnnounce("You can request and hide the video through the menu.");
