const _ = window._ = undefined;
String.prototype.cRepeat = function(num){
    let num2 = Math.floor(+num)
    if (isNaN(+num2)) {return this}
    if (num2 < 0) {return ''}
    if (num2 > 16384) {num = 16384}
    repeatedString = num2==0?'':this;
    for(let i=0;i<num2-1;i++){
        repeatedString += this
    }
    if((num|0)!=+num){
        repeatedString+=this.substring(0,Math.floor(this.length*((+num)-(num|0))))
    }
    return repeatedString
}
Array.prototype.randomElm = function(){return this[Math.floor(Math.random()*this.length)]};
Array.prototype.last = function(){return this[this.length-1]}
Math.randRange = (a,b)=>Math.random()*(b-a)+a;
w.setFlushInterval(1);
w.broadcastReceive(1);
Number.prototype.inRange = function(a, b, exclusive=0){
    if(a>b){[a,b]=[b,a]}
    switch (exclusive) {
        case 0: {return this >= a && this <= b;}
        case 1: {return this > a && this <= b;}
        case 2: {return this >= a && this < b;}
        case 3: {return this > a && this < b;}
    }
}
convertTileToXY = (tileX,charX,tileY,charY)=>[tileX*tileC+charX, tileY*tileR+charY]
convertXYtoTile = (x,y)=>{
    return [Math.floor(x / tileC),
    Math.floor(y / tileR),
    x - Math.floor(x / tileC) * tileC,
    y - Math.floor(y / tileR) * tileR]
}
q_queue = [];
queueCharToXY = function (char, charColor, x, y, noUndo=true, priority=0, decoration=null, bgColor) {
    if (q_queue.length > 4096) {return}
    x = Math.floor(x);y = Math.floor(y);
	if (!Permissions.can_color_text(state.userModel, state.worldModel)) charColor=0;
    q_queue.push([char, charColor, x, y, noUndo, priority, decoration, bgColor]);
}
writeCharToXY = function (char, charColor, x, y, noUndo=true, bgColor=null,
                         bold=false, italic=false, underline=false, strike=false) {
    if (writeBuffer.length > 8192) {return}
	if (getCharInfoXY(x, y).protection) {return}
    x = Math.floor(x);y = Math.floor(y);
	if (!Permissions.can_color_text(state.userModel, state.worldModel)) charColor=0;
    writeCharTo(char, charColor, ...convertXYtoTile(x, y), noUndo, null,
               bgColor, bold, italic, underline, strike);
}
writeTextToXY = function (text, color, x, y, noUndo=true) {
	text = text+"";
    textArray = [...text];
    xpos=0;line=0;flag=0;
    if(color=="line"){flag=text.split('\n').length;color=0xffffff-((8-flag)*0x201000);}
    textArray.forEach(
        function(writing, index){
            if (writing == '\n') {line+=1;xpos=0;
                if(flag>0){color=0xffffff-((8-flag)*0x201000);flag--;}
                if(color>0xffffff){color=0xffffff}
                return
            }
            writeCharToXY(writing,color,x+xpos,y+line,noUndo);
            xpos += 1;
        }
    )
}
queueTextToXY = function (text, color, x, y, noUndo=true, priority=0, decoration=null, bgColor) {
	text = text+"";
    textArray = [...text];
    xpos=0;line=0;flag=0;
    if(color=="line"){flag=text.split('\n').length;color=0xffffff-((8-flag)*0x201000);}
    textArray.forEach(
        function(writing, index){
            if (writing == '\n') {line+=1;xpos=0;
                if(flag>0){color=0xffffff-((8-flag)*0x201000);flag--;}
                if(color>0xffffff){color=0xffffff}
                return
            }
            queueCharToXY(writing,color,x+xpos,y+line,noUndo,priority,decoration,bgColor);
            xpos += 1;
        }
    )
}
q_flushedCount = 0;
flushQueue = function (firstCheck = true, secondCheck = true) {
    let i = 0;
    if (firstCheck) {
        while (i<q_queue.length) {
            let j = q_queue[i];
            if (q_queue.filter(e=>e!=j&&e[2]==j[2]&&e[3]==j[3]&&e[5]>=j[5]).length) {
                q_queue.splice(i, 1);
            } else {i++}
        }
    }
    if (secondCheck) {
        i = 0;
        while (i<q_queue.length) {
            let j = [...q_queue[i]];
            let jinfo = getCharInfoXY(j[2], j[3]);
			let compress = e=>!!e.bold*8+!!e.italic*4+!!e.under*2+!!e.strike
			if (j[6] && jinfo.decoration) {
				j[6] = compress(j[6])
				jinfo.decoration = compress(jinfo.decoration)
			}
            if (jinfo.char == j[0] && jinfo.color == j[1] && jinfo.decoration == j[6]
			   && !getLinkXY(j[2], j[3])) {
                q_queue.splice(i, 1);
            } else {i++}
        }
    }
    q_queue.forEach(e=>{
		e[5] = e[7];
        e[6] ??= {};
        e[7] = e[6].italic;
        e[8] = e[6].under;
        e[9] = e[6].strike;
        e[6] = e[6].bold;
        writeCharToXY(...e);
        q_flushedCount++;
    });
    q_queue.splice(0);
}
Array.prototype.swap = function(i, j){
    let newArray = structuredClone(this);
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    return newArray;
}
pasteChars = function(value){
    var parser = textcode_parser(value, {
			tileX: cursorCoords[0],
			tileY: cursorCoords[1],
			charX: cursorCoords[2],
			charY: cursorCoords[3]
		}, YourWorld.Color, YourWorld.BgColor);
    var yieldItem;
    pasteInterval = setInterval(function() {
		var res;
		if(yieldItem) {
			res = cyclePaste(null, yieldItem);
			yieldItem = null;
		} else {
			res = cyclePaste(parser);
		}
		if(!res || cursorCoords == null) {
			clearInterval(pasteInterval);
			write_busy = false;
		} else if(typeof res == "object") {
			yieldItem = res;
		}
	}, 16);
}
cyclePaste = Function("parser", "yieldItem", cyclePaste.toString().match(new RegExp('(?<=\{)[^]{0,}(?=\})'))[0].replace('\t\treturn true;', '\t\tmoveCursor("right");return true;'));
getCombDecoration = c=>{let d = ([...c][1]??" ").codePointAt()-0x20f0;return {bold:d&8,italic:d&4,under:d&2,strike:d&1}}
cyclePasteQueue = Function("parser", "yieldItem", cyclePaste.toString().match(new RegExp('(?<=\{)[^]{0,}(?=\})'))[0].replace(
	'writeChar(item.char, false, item.color, !item.newline, 0, item.bgColor);',
	`queueCharToXY(item.char, item.color, ...convertTileToXY(...cursorCoords.swap(1,2)), _, _, getCombDecoration(item.char), item.bgColor);if(item.char=="\\n"||item.char=="\\r"){writeChar("\\n")}else{moveCursor("right", true)}`))
instaPaste = function(value){
    var parser = textcode_parser(value, {
			tileX: cursorCoords[0],
			tileY: cursorCoords[1],
			charX: cursorCoords[2],
			charY: cursorCoords[3]
		}, YourWorld.Color, YourWorld.BgColor);
    var yieldItem;
    while(true){
		var res;
		if(yieldItem) {
			res = cyclePasteQueue(null, yieldItem);
			yieldItem = null;
		} else {
			res = cyclePasteQueue(parser);
		}
		if(!res || cursorCoords == null) {
			break;
		} else if(typeof res == "object") {
			yieldItem = res;
		}
	}
	write_busy = false;
	flushQueue();
}
isLight = function (c) {return .213 * c[0] + .715 * c[1] + .072 * c[2] > 127.5}
sleep = function(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}
mod = (x, y)=>((x % y) + y) % y;
hsv_to_rgb = function(h=0, s=1, v=1) {
	h = mod(h, 360);
	let m = v * s;
	let o = m * (1 - Math.abs((h/60)%2 - 1));
	let r, g, b;
	switch (Math.floor(h/60)) {
		case 0: [r, g, b] = [m, o, 0];break;
		case 1: [r, g, b] = [o, m, 0];break;
		case 2: [r, g, b] = [0, m, o];break;
		case 3: [r, g, b] = [0, o, m];break;
		case 4: [r, g, b] = [o, 0, m];break;
		default: [r, g, b] = [m, 0, o];
	}
	let w = v - m;
	return [(r+w)*255, (g+w)*255, (b+w)*255];
}
fullWidthRegex = /[ᄀ-ᅟ⺀-⻳⼀-⿕⿰-⿻　-〾ぁ-䶿一-鿼가-힣ힰ-ퟻ豈-龎︐-︙︰-﹫！-｠￠-￦𖿠-𖿤𖿰𖿱𗀀-𘴈𛀀-𛄢𛅐-𛋻🀀-🁡🄐-🄪🄮🅰-🆏🆑-🆭🈀-🌪🎘🎞-🏴🏷-🐾👀👂-💦💨-💱💳-📌📏-📾🔀-🔇🔉-🕁🕅🕉🕋-🕧🕪-🕮🕰🕲🕳🕵🕶🕸🕾-🖀🖂-🖆🖉-🖍🖐🖕🖖🖘-🖝🖤🖦-🖨🖪-🖸🖼🗂🗃🗔🗖🗗🗚-🗠🗢-🗳🗺-🙩🙬🙮🙰-🙵🙼-🚎🚐-🚥🚧-🛇🛋-🛍🛐-🛒🛕🛠🛣-🛥🛧-🛰🛲-🜀�-🜇🜐🜓🜜🜡🜤🜳🜼🜽🜾🝃🝄🝇🝉🝐-🝒🝙-🝜🝠🝫🝬🝮🞁🞃🞅-🞋🞎-🞖🞚-🞜🞡-🞧🞯-🞴🞺🟈🟕-🟘🟠-🟫🠰🠲🡠-🢇🤀-🫖⌚⌛〈〉⏩-⏬⏰⏳⏽⏾☔☕♈-♓♿⚓⚡⚪⚫⚽⚾⛄⛅⛎⛔⛪⛲⛳⛵⛽✅✊✋✨❌❎❓❔➰➿⬛⬜⭐⭕]/gu;
addSpaceToFullWidth = function(str) {
	let matches = str.matchAll(fullWidthRegex);
	str = [...str];
	for (let m of matches) {
		let i = m.index;
		if (i == str.length - 1) continue;
		str[i] += " ";
	}
	return str.join("");
}