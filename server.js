radiocontain = document.createElement("span");
radiocontain.style.top = "0";
radiocontain.style.position = "absolute";
radiocontain.style.padding = "4px 4px 48px";
radiocontain.style.background = "#54e58b";
west_gui.style.zIndex = 1;
ytdrag = draggable_element(radiocontain);
document.body.appendChild(radiocontain);
var ytPaused;
var currentVideo = "ci5MzuiXBJA";
var audioPlayer = new Audio;
audioPlayer.addEventListener("ended", function(){
    if (currentPlaylist && currentVideo.startsWith("src:")) {
        let nextVideo = currentPlaylist[currentPlaylistIndex+1];
        if (nextVideo) {
            currentPlaylistIndex += 1;
            changeVideo(nextVideo)
        } else if (playlistLoop) {
            currentPlaylistIndex = 0;
            changeVideo(currentPlaylist[0])
        }
    }
});
audioPlayer.addEventListener("click", function(){
    network.cmd("limeradio_seek "+audioPlayer.currentTime, true);
});
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
    ytobject.addEventListener("onStateChange", function(){
        let s = ytobject.getPlayerState();
        let id = ytobject.getVideoData().video_id;
        if (s == 0) {
            if (currentPlaylist && !currentVideo.startsWith("src:")) {
                let nextVideo = currentPlaylist[currentPlaylistIndex+1];
                if (nextVideo) {
                    currentPlaylistIndex += 1;
                    changeVideo(nextVideo)
                } else if (playlistLoop) {
                    currentPlaylistIndex = 0;
                    changeVideo(currentPlaylist[0])
                }
            }
        } else if (s == 1 && currentVideo != id) {
            if (currentVideo == id) {
                network.cmd("limeradio_"+(ytPaused?"seekpause ":"seek ")+ytobject.getCurrentTime(), true);
            } else {
                network.cmd("limeradio_change "+ytobject.getVideoData().video_id, true);
                currentVideo = id;
                r_timer = 0;
                ytPaused = false
            }
        } else if (s == 2) {
            network.cmd("limeradio_pause", true);
            ytPaused = true
        } else if (s == 3) {
            network.cmd("limeradio_seek "+ytobject.getCurrentTime(), true);
            currentVideo = id;
            ytPaused = false
        }
    })
    player.remove();
    player = ytobject.g;
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
var currentPlaylist = null;
var currentPlaylistIndex = 0;
var playlistLoop = false;
network.cmd("limeradio_change "+currentVideo, true);
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
        await sleep(10);
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
        await sleep(10);
    }
}
async function changeVideo(id="ci5MzuiXBJA") {
    network.cmd("limeradio_change "+id, true);
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
    r_timer = 0;
}
w.doAnnounce("loading requests...", "request");
w.doAnnounce("", "request");
w.ui.announcements.request.text.addEventListener("click", function(){
    changeVideo(r_requests.pop()[1]);
    w.ui.announcements.request.close.click();
})
var r_requests = [];
const r_reqSound = new Audio("https://files.catbox.moe/t2qv84.wav");
function handleRequest(arg, user) {
    let id = arg[1];
    if (r_requests.some(e=>e[0]==id)) return;
    let request = [user, id];
    if (id.startsWith("src:")) {
        return w.doAnnounce((user??"An anon")+" requests "+id)
    }
    fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet&id="+id+"&key=AIzaSyCczAe-Z9LG9Ie46OovCFX9A1J2Up8bE2U").then(e=>e.json()).then(function(data) {
        if (!data.items[0]) return;
        request.push(data.items[0].snippet.title);
        r_requests.push(request);
        w.doAnnounce((user??"An anon")+" requests "+id+" ("+request[2]+")", "request");
        r_reqSound.currentTime = 0; r_reqSound.play();
    });
}
function seekThroughPlaylist(i) {
    currentPlaylistIndex = i;
    changeVideo(currentPlaylist[currentPlaylistIndex]);
}
async function doPlaylistRequests(...id) {
    currentPlaylist.splice(currentPlaylistIndex+1, 0, ...id);
}
var abortCount = 0;
var listenerList = [];
function handlePing(arg, e) {
    let time;
    let paused;
    if (currentVideo.startsWith("src:")) {
        time = audioPlayer.currentTime;
        paused = audioPlayer.paused;
    } else {
        time = ytobject.getCurrentTime();
        paused = ytPaused;
    }
    network.cmd("limeradio_pong "+currentVideo+" "+time+" "+paused, true);
    if (listenerList.map(e=>e[0]).includes(e.sender)) return;
    listenerList.push([e.sender, e.username]);
}
async function listenChecker() {
    let [a, passedList] = [abortCount];
    function check(e) {
        if (!listenerList.map(e=>e[0]).includes(e.sender)) return;
        if (e.data != "limeradio_here") return;
        if (passedList.includes(e.sender)) return;
        passedList.push(e.sender);
    };
    while (abortCount == a) {
        network.cmd("limeradio_check", true);
        passedList = [];
        w.on("cmd", check);
        await sleep(2000);
        w.off("cmd", check);
        listenerList = listenerList.filter(e=>passedList.includes(e[0]));
        await sleep(8000);
    }
}
w.on("cmd", function(e){
    if (!e.data.startsWith("limeradio_")) return;
    let cmd = e.data.slice(10).split(" ");
    if (cmd.last() != state.userModel.username) return;
    if (cmd[0] == "request") { handleRequest(cmd, e.username) }
    else if (cmd[0] == "ping") { handlePing(cmd, e) }
    else if (cmd[0] == "byebye") {
        let index = listenerList.findIndex(e=>e[0]==e.sender);
        if (index == -1) return;
        listenerList.splice(e.sender, 1);
    }
});
var radioPos;
var counters = ["", "", "", ""];
function queueProgressBar(x, y, pal) {
    let time, p;
    if (currentVideo.startsWith("src:")) {
        time = [audioPlayer.currentTime, audioPlayer.duration];
        if (isNaN(time[1])) time[1] = 0;
        p = (audioPlayer.ended ? time[1] : time[0].toFixed(3)) ?? 0;
    } else {
        time = [ytobject.getCurrentTime(), (ytobject.getDuration()??0).toFixed(3)];
        p = (ytobject.getPlayerState() ? time[0].toFixed(3) : time[1]) ?? 0;
    }
    queueTextToXY([...counters[1]].fill(" ").join(""), 0x96b4a3, x, y);
    queueTextToXY(p, pal[1], x, y);
    queueTextToXY(" / "+time[1], pal[2], (p+"").length+x, y);
    counters[1] = p + " / " + time[1];
    let tl = Math.min(0, (time[0] - time[1]).toFixed(3));
    queueTextToXY([...counters[2]].fill(" ").join(""), 0x2a7346, 32-[...counters[2]].length+x, y)
    counters[2] = tl+"";
    queueTextToXY(tl, pal[4], 32-(tl+"").length+x, y);
    let bars = time[0] / time[1] * 32;
    let dx = 0;
    if (currentVideo.startsWith("src:") ? !audioPlayer.ended : ytobject.getPlayerState()) {
        while (dx < Math.min(32, Math.floor(bars))) {
            queueCharToXY("=", pal[1], dx+x, y+1);dx++;
        }
        if (bars%1 >= 0.5 || bars >= 31 & bars < 32) { queueCharToXY("-", pal[3], dx+x, y+1);dx++ }
        while (dx < 32) {
            queueCharToXY("·", pal[4], dx+x, y+1);dx++;
        }
    } else {
        while (dx < 32) {
            queueCharToXY("=", rgb_to_int(...hsv_to_rgb(r_timer*10)), dx+x, y+1);dx++;
        }
    }
}
var r_palnum = 1;
function r_getPal(n=r_palnum??1) {
    let pal;
    if (n == 0) {
        pal = [0x44524a, 0x77bbdd, 0x557788, 0x6699aa, 0x557788, 0x448866];
    } else if (n == 2) {
        pal = [0x363073, 0xa5a0ff, 0x6c60e6, 0x8e98ff, 0x7790ff, 0x7790ff];
    } else if (n == 3) {
        pal = [0x8a8476, 0xecda13, 0x7c730a, 0xeccc14, 0xecbe15, 0xecbe15];
    } else if (n == 4) {
        pal = [0x551111, 0xdd3333, 0x771111, 0xaa2222, 0x771111, 0xaa2222];
    } else if (n == 5) {
        pal = [0xffff00, 0xff0000, 255, 0x800080, 255, 0x8000];
    } else if (n == 5.5) {
        pal = [0xff0000, 0xffff00, 255, 0x808080, 255, 0x8000];
    } else if (n == 999) {
        pal = [
            rgb_to_int(...hsv_to_rgb(r_timer*15, 0.2, 0.7)),
            rgb_to_int(...hsv_to_rgb(r_timer*15, 0.8, 0.9)),
            rgb_to_int(...hsv_to_rgb(r_timer*15, 0.8, 0.45)),
            rgb_to_int(...hsv_to_rgb(r_timer*15, 0.7, 0.6)),
            rgb_to_int(...hsv_to_rgb(r_timer*15, 0.6, 0.3)),
            rgb_to_int(...hsv_to_rgb(r_timer*15+180, 0.8, 0.9))
        ]
    } else {
        pal = [0x8eb29c, 0x54e58b, 0x2a7346, 0x2ad0be, 0xbcf1, 0xbcf1]
    }
    return pal;
}
var r_timer = 0;
var r_anncEnabled = true;
var r_annc = [
    ["lorem ipsum dolor sit amet consectetur", "• adipiscing elit"]
]; // [prefix, suffix];
var r_anncSpace = 24;
var r_anncPadding = 1;
var r_dispAnnc = r_annc[0];
var r_anncTimer = 0;
var r_relAnncPos = [5, 9];
function getScrollText(text="Lorem ipsum dolor sit amet.", space=16, scroll=0) {
    text = [...text];
    let length = text.length;
    scroll = Math.max(Math.min(length - space, scroll), 0);
    if (space <= 0) return "";
    if (length <= space) return text.join("");
    text = text.slice(0+scroll, space+scroll);
    if (scroll < length-space) {
        text = text.slice(0, -1).concat("…");
    }
    if (scroll > 0) {
        text = ["…"].concat(text.slice(1));
    }
    return text.join("");
}
function makeRadio(x, y) {
    if (!(ytobject && ytobject.getVideoData)) return false;
    let pal = r_getPal();
    queueTextToXY("o\n|\n|\n|", pal[0], x+9, y-4);
    queueTextToXY("."+"–".repeat(34)+"."+"\n|".repeat(6), pal[0], x, y);
    queueTextToXY("lime.radio", 0x54e58b, x+2, y, _, _, {bold:1});
    queueTextToXY("'"+"=".repeat(34)+"'", pal[0], x, y+7);
    queueTextToXY("|\n".repeat(6), pal[0], x+35, y+1);
    let data = currentVideo.startsWith("src:") ? {title: currentVideo.slice(4)} : ytobject.getVideoData();
    queueTextToXY([...counters[0]].fill(" ").join(""), pal[0], x+2, y+1);
    if (data) {
        let r_timerMod = r_timer%64
        let showTitle = r_timerMod < 40 || currentVideo.startsWith("src:");
        queueTextToXY(showTitle ? "playing: " : "by: ", pal[1], x+2, y+1);
        let toShow = (showTitle ? data.title : data.author) ?? "loading...";
        toShow = addSpaceToFullWidth(toShow);
        let scroll = showTitle ? r_timerMod : r_timerMod - 40;
        scroll = Math.min(Math.max(0, scroll - 5), toShow.length-28+showTitle*5);
        let sToShow = getScrollText(toShow, 28-showTitle*5, scroll);
        queueTextToXY(sToShow, pal[1], x+6+showTitle*5, y+1, _, _);
        counters[0] = " ".repeat(4+showTitle*5+[...sToShow].length);
    } else {counters[0] = ""}
    queueProgressBar(x+2, y+2, pal);
    queueTextToXY([...counters[3]].fill(" ").join(""), pal[0], x+2, y+4);
    queueTextToXY(listenerList.length, pal[5], x+2, y+4, _, _, {bold:1});
    queueTextToXY(" listening", pal[5], x+2+(listenerList.length+"").length, y+4);
    counters[3] = " ".repeat((listenerList.length+"").length+10);
    queueTextToXY(`host: ${state.userModel.username}`, pal[1], x+2, y+5, _, _, {italic:1});
    if (r_timer%64<32) {
        queueTextToXY("inspired by ", pal[1], x+2, y+6, _, _, {italic:1});
        queueTextToXY("Boo's Beats!", 0xa6a6a6, x+14, y+6, _, _, {italic:1})
    } else {
        if (r_timer%64==32) queueTextToXY("         ", pal[0], x+17, y+6);
        queueTextToXY("tune in here! ↘", pal[1], x+2, y+6, _, _, {bold:1,italic:1})
    }
    queueTextToXY("≫ files.catbox.moe/yxg22k.js", r_palnum > 1 ? pal[5] : r_palnum ? 0x2ad0be : 0x54e58b, x+6, y+7, _, _, {bold: (r_timer+32)%64<18 ? r_timer%4/2<1 : 0});
	queueTextToXY("  \n".repeat(6), pal[0], x+1+r_timer%17*2, y+1, _, -1);
    if (r_anncEnabled) {
        queueTextToXY("#".repeat(r_anncSpace+r_anncPadding*2), 0x2a7346, x+r_relAnncPos[0], y+r_relAnncPos[1]);
        let nextAnnc;
        if (r_dispAnnc) {
            let anncSpace = r_anncSpace-[...r_dispAnnc[1]??""].length-!!(r_dispAnnc[1]??"".length);
            let headerDisp = getScrollText(r_dispAnnc[0]??"",
                                  anncSpace, r_anncTimer - 4).replace(/ | /g, "\0");
            queueTextToXY(headerDisp, 0x54e58b, x+r_relAnncPos[0]+r_anncPadding, y+r_relAnncPos[1]);
            let footerDisp = getScrollText(r_dispAnnc[1]??"",
                                 r_anncSpace - Math.max(0, [...headerDisp].length-!!(headerDisp.length)),
                                 r_anncTimer - 4).replace(/ | /g, "\0");
            queueTextToXY(footerDisp, 0x54e58b, x+r_relAnncPos[0]+r_anncPadding+r_anncSpace-[...footerDisp].length, y+r_relAnncPos[1]);
            if (r_anncTimer >= 32 && r_anncTimer >= [...r_dispAnnc[0]??""].length - anncSpace + 12 || !r_dispAnnc) {
                nextAnnc = true
            }
        } else {nextAnnc = true}
        if (nextAnnc) {
            if (r_dispAnnc) {
                r_dispAnnc = r_annc[(r_annc.findIndex(a=>r_dispAnnc[0]==a[0]&&r_dispAnnc[1]==a[1])+1) % r_annc.length];
            } else {r_dispAnnc = r_annc[0]}
            r_anncTimer = -1;
        }
    }
    return flushQueue();
}
async function canvasRadioMain(interval=200) {
    let a = abortCount;
    while (abortCount == a) {
        makeRadio(...radioPos);
        ++r_timer; ++r_anncTimer;
        await sleep(interval);
    }
}
async function startRadio(interval=200) {
    canvasRadioMain(interval);
    listenChecker();
    network.cmd("limeradio_change "+ytobject.getVideoData().video_id, true);
    await sleep(500);
    network.cmd("limeradio_seek "+ytobject.getCurrentTime(), true);
}
function shutOffRadio() {
    queueTextToXY("offline", 0xff0000, radioPos[0]+27, radioPos[1], _, 1, {bold:1});
    makeRadio(...radioPos);
    abortCount++;
}
menu.addOption("Load video", function(){
    let id = prompt("gimme video id...", "ci5MzuiXBJA");
    if (id) changeVideo(id);
});
menu.addOption("Load playlist", function(){
    let ids = prompt("gimme video ids and separate with comma no space...!",
                     `msiqgQe7EWE,T31VAEkxi98,zNd4apsr3WE`.replaceAll("\n", ""));
    if (ids) {
        currentPlaylist = ids.split(",");
        seekThroughPlaylist(0);
    }
});
menu.addOption("Play requests next in playlist", ()=>{doPlaylistRequests(...r_requests.map(e=>e[1]));r_requests = []});
menu.addCheckboxOption("Playlist loops", ()=>playlistLoop=true, ()=>playlistLoop=false);
menu.addCheckboxOption("Hide video", ()=>radiocontain.style.display="none", ()=>radiocontain.style.display="");
menu.addOption("Increment palette", ()=>r_palnum = (r_palnum+1)%5);
menu.addOption("Decrement palette", ()=>r_palnum = mod(r_palnum-1, 5));
menu.addOption("Start radio", function(){
    radioPos ??= convertTileToXY(...cursorCoords.swap(1, 2));
    startRadio();
});
w.doAnnounce("Use the menu to start writing the radio to the canvas.");
menu.addOption("Shut off radio", ()=>shutOffRadio());
menu.addOption("Relocate radio", function(){
    radioPos = convertTileToXY(...cursorCoords.swap(1, 2));
});
