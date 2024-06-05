ytcontain = document.createElement("span");
ytcontain.style.top = "0";
ytcontain.style.position = "absolute";
ytcontain.style.padding = "4px 4px 48px";
ytcontain.style.background = "#54e58b";
west_gui.style.zIndex = 1;
ytdrag = draggable_element(ytcontain);
document.body.appendChild(ytcontain);
player = document.createElement("div");
player.id = "player";
ytcontain.appendChild(player);
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
        videoId: 'ci5MzuiXBJA',
        enablejsapi: '1',
        events: {
            onReady: e=>e.target.playVideo()
        }
    });
    ytobject.addEventListener("onStateChange", function(){
        let s = ytobject.getPlayerState();
        let id = ytobject.getVideoData().video_id;
        if (s == 1 && currentVideo != id) {
            if (currentVideo == id) {
                network.cmd("limeradio_seek "+ytobject.getCurrentTime(), true)
            } else {
                network.cmd("limeradio_change "+ytobject.getVideoData().video_id, true);
                currentVideo = id;
                timer = 0;
            }
        } else if (s == 2) {
            network.cmd("limeradio_pause", true)
        } else if (s == 3) {
            network.cmd("limeradio_seek "+ytobject.getCurrentTime(), true)
        }
    })
    player.remove();
    player = ytobject.g;
    await new Promise(async function(r){
        while (true) {
            await new Promise(r=>setTimeout(r, 200));
            if (ytobject.getVideoData) return r();
        }
    });
    canvasRadioMain();
});
var currentVideo = "ci5MzuiXBJA";
async function changeVideo(id="ci5MzuiXBJA") {
    network.cmd("limeradio_change "+id, true);
    if (id == currentVideo) {
        ytobject.seekTo(0);return
    }
    ytobject.loadVideoById(id);
    currentVideo = id;
    titleTimer = 0;
}
async function pushToPlaylist(...id) {
    let np = ytobject.getPlaylist().concat(...id);
    let t = ytobject.getCurrentTime();
    let i = ytobject.getPlaylistIndex();
    ytobject.loadPlaylist(np, i);
    await sleep(500);
    ytobject.seekTo(t);
}
async function doPlaylistRequests(...id) {
    let t = ytobject.getCurrentTime();
    let i = ytobject.getPlaylistIndex();
    let np = ytobject.getPlaylist().splice(i+1, 0, ...id);
    ytobject.loadPlaylist(np, i);
    await sleep(500);
    ytobject.seekTo(t);
}
w.doAnnounce("loading requests...", "request");
w.doAnnounce("", "request");
w.ui.announcements.request.text.addEventListener("click", function(){
    changeVideo(requests.pop()[1]);
    w.ui.announcements.request.close.click();
})
var requests = [];
function handleRequest(arg, user) {
    let id = arg[1];
    if (requests.some(e=>e[0]==id)) return;
    let request = [user, id];
    fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet&id="+id+"&key=AIzaSyCczAe-Z9LG9Ie46OovCFX9A1J2Up8bE2U").then(e=>e.json()).then(function(data) {
        if (!data.items[0]) return;
        request.push(data.items[0].snippet.title);
        requests.push(request);
        w.doAnnounce((user??"An anon")+" requests "+request[1]+" ("+request[2]+")", "request");
    });
}
async function pushToPlaylist(...id) {
    let np = ytobject.getPlaylist().concat(...id);
    let t = ytobject.getCurrentTime();
    let i = ytobject.getPlaylistIndex();
    ytobject.loadPlaylist(np, i);
    await sleep(500);
    ytobject.seekTo(t);
}
async function doPlaylistRequests(...id) {
    let t = ytobject.getCurrentTime();
    let i = ytobject.getPlaylistIndex();
    let np = ytobject.getPlaylist();
    np.splice(i+1, 0, ...id);
    ytobject.loadPlaylist(np, i);
    await sleep(500);
    ytobject.seekTo(t);
}
var listenerList = [];
function handlePing(arg, sender) {
    network.cmd("limeradio_pong "+currentVideo+" "+ytobject.getCurrentTime(), true);
    if (listenerList.includes(sender)) return;
    listenerList.push(sender);
}
async function listenChecker() {
    let passedList, check;
    while (true) {
        if (ABORT) return;
        network.cmd("limeradio_check", true);
        passedList = [];
        w.on("cmd", check = function(e) {
            if (!listenerList.includes(e.sender)) return;
            if (e.data != "limeradio_here") return;
            if (passedList.includes(e.sender)) return;
            passedList.push(e.sender);
        });
        await sleep(2000);
        w.off("cmd", check);
        listenerList = [...passedList];
        await sleep(8000);
    }
}
listenChecker();
w.on("cmd", function(e){
    if (!e.data.startsWith("limeradio_")) return;
    let cmd = e.data.slice(10).split(" ");
    if (cmd.last() != state.userModel.username) return;
    if (cmd[0] == "request") { handleRequest(cmd, e.username) }
    else if (cmd[0] == "ping") { handlePing(cmd, e.sender) }
    else if (cmd[0] == "byebye") {
        let index = listenerList.indexOf(e.sender);
        if (index == -1) return;
        listenerList.splice(e.sender, 1);
    }
});
var radioPos = convertTileToXY(...cursorCoords.swap(1, 2));
var counters = ["", "", "", ""];
function queueProgressBar(x, y, pal) {
    let time = [ytobject.getCurrentTime(), ytobject.getDuration()];
    queueTextToXY([...counters[1]].fill(" ").join(""), 0x96b4a3, x, y);
    let p = (ytobject.getPlayerState() ? time[0].toFixed(3) : time[1]) ?? 0;
    queueTextToXY(p, pal[1], x, y);
    queueTextToXY(" / "+time[1], pal[2], (p+"").length+x, y);
    counters[1] = p + " / " + time[1];
    let tl = Math.min(0, (time[0] - time[1]).toFixed(3));
    queueTextToXY([...counters[2]].fill(" ").join(""), 0x2a7346, 32-[...counters[2]].length+x, y)
    counters[2] = tl+"";
    queueTextToXY(tl, pal[4], 32-(tl+"").length+x, y);
    let bars = time[0] / time[1] * 32;
    let dx = 0;
    if (ytobject.getPlayerState()) {
        while (dx < Math.min(32, Math.floor(bars))) {
            queueCharToXY("=", pal[1], dx+x, y+1);dx++;
        }
        if (bars%1 >= 0.5 || bars >= 31 & bars < 32) { queueCharToXY("-", pal[3], dx+x, y+1);dx++ }
        while (dx < 32) {
            queueCharToXY("·", pal[4], dx+x, y+1);dx++;
        }
    } else {
        while (dx < 32) {
            queueCharToXY("=", rgb_to_int(...hsv_to_rgb(timer*10)), dx+x, y+1);dx++;
        }
    }
}
var palnum = 1;
function makeRadio(x, y) {
    let pal;
    if (palnum == 0) {
        pal = [0x44524a, 0x4aca7b, 0x276843, 0x38995f, 0x276843, 0x3399cc];
    } else if (palnum == 3) {
        pal = [0x114411, 0x22dd22, 0x226622, 0x22aa22, 0x226622, 0x226622];
    } else if (palnum == 2) {
        pal = [0x113377, 0x22aaff, 0x2266aa, 0x2288cc, 0x2266aa, 0x2266aa];
    } else if (palnum == 4) {
        pal = [0x551111, 0xdd3333, 0x771111, 0xaa2222, 0x771111, 0xaa2222];
    } else if (palnum == 5) {
        pal = [
            rgb_to_int(...hsv_to_rgb(timer*15, 0.2, 0.7)),
            rgb_to_int(...hsv_to_rgb(timer*15, 0.8, 0.9)),
            rgb_to_int(...hsv_to_rgb(timer*15, 0.8, 0.45)),
            rgb_to_int(...hsv_to_rgb(timer*15, 0.7, 0.6)),
            rgb_to_int(...hsv_to_rgb(timer*15, 0.6, 0.3)),
            rgb_to_int(...hsv_to_rgb(timer*15+180, 0.8, 0.9))
        ]
    } else {
        pal = [0x96b4a3, 0x54e58b, 0x2a7346, 0x2ad0be, 0xbcf1, 0xbcf1]
    }
    queueTextToXY("o\n|\n|\n|", pal[0], x+9, y-4);
    queueTextToXY("."+"–".repeat(34)+"."+"\n|".repeat(6), pal[0], x, y);
    queueTextToXY("lime.radio", 0x54e58b, x+2, y, _, _, {bold:1});
    queueTextToXY("'"+"=".repeat(34)+"'", pal[0], x, y+7);
    queueTextToXY("|\n".repeat(6), pal[0], x+35, y+1);
    let data = ytobject.getVideoData();
    if (data) {
        let timerMod = timer%64
        let showTitle = timerMod < 40;
        queueTextToXY([...counters[0]].fill(" ").join(""), pal[0], x+2, y+1);
        queueTextToXY(showTitle ? "playing: " : "by: ", pal[1], x+2, y+1);
        let toShow = (showTitle ? data.title : data.author) ?? "loading...";
        toShow = addSpaceToFullWidth(toShow);
        let toShow2;
        if (toShow.length > 28-showTitle*5) {
            let scroll = showTitle ? timerMod : timerMod - 40;
            scroll = Math.min(Math.max(0, scroll - 5), toShow.length-28+showTitle*5);
            toShow2 = toShow.slice(0+scroll, 28-showTitle*5+scroll);
            if (scroll < toShow.length-28+showTitle*5) {
                toShow2 = toShow2.slice(0, -1) + "…"
            }
            if (scroll) {
                toShow2 = "…" + toShow2.slice(1)
            }
        } else {toShow2 = toShow}
        queueTextToXY(toShow2, pal[1], x+6+showTitle*5, y+1, _, _);
        counters[0] = " ".repeat(4+showTitle*5+toShow2.length)
    }
    queueProgressBar(x+2, y+2, pal);
    queueTextToXY([...counters[3]].fill(" ").join(""), pal[0], x+2, y+4);
    queueTextToXY(listenerList.length, pal[5], x+2, y+4, _, _, {bold:1});
    queueTextToXY(" listening", pal[5], x+2+(listenerList.length+"").length, y+4);
    counters[3] = " ".repeat((listenerList.length+"").length+10);
    queueTextToXY("made by lime.owot\ninspired by ", pal[1], x+2, y+5, _, _, {italic:1});
    queueTextToXY("Boo's Beats!", 0xa6a6a6, x+14, y+6, _, _, {italic:1});
    queueTextToXY("≫ files.catbox.moe/ra4fvz.js", palnum > 1 ? pal[5] : 0x2ad0be, x+6, y+7, _, _, {bold:1});
    queueTextToXY("  \n".repeat(6), 0x96b4a3, x+1+timer%17*2, y+1, _, -1)
    flushQueue();
}
var ABORT;
var timer = 0;
async function canvasRadioMain() {
    while (true) {
        makeRadio(...radioPos);
        ++timer;
        if (ABORT) return;
        await sleep(200);
    }
}
menu.addOption("Load video", function(){
    let id = prompt("gimme video id...", "ci5MzuiXBJA");
    if (id) changeVideo(id);
})
menu.addOption("Load playlist", function(){
    let ids = prompt("gimme video ids and separate with comma no space...!",
                     `msiqgQe7EWE,T31VAEkxi98,zNd4apsr3WE`.replaceAll("\n", ""));
    if (ids) {
        ids = ids.split(",");
        ytobject.loadPlaylist(ids);
    }
})
menu.addOption("Load playlist by ID", function(){
    let id = prompt("gimme playlist id...", "PLnQAp98pIPCiJfA3pDEEwjRzWRshuiMPu");
    if (id) {
        ytobject.loadPlaylist({
            listType: "playlist",
            list: id
        })
    }
})
menu.addOption("Play requests next in playlist", ()=>{doPlaylistRequests(...requests.map(e=>e[1]));requests = []});
menu.addCheckboxOption("Hide video", ()=>ytcontain.style.display="none", ()=>ytcontain.style.display="");
menu.addOption("Increment palette", ()=>palnum = (palnum+1)%4);
menu.addOption("Decrement palette", ()=>palnum = mod(palnum-1, 4));