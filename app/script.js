
	function coreMode_OnLoad(){
 		debug('\n coreMode_OnLoad - START');
 
		_UI.testdrive.canvas = document.getElementById('tdcanvas');
		_UI.testdrive.canvas.width = 800;
		_UI.testdrive.canvas.height = 700;
		_UI.testdrive.ctx = _UI.testdrive.canvas.getContext('2d');
		_UI.testdrive.cache = {};

		debug('\t loading font');

		hydrateGlyphrProject(_UI.font);

		// var f = evt.dataTransfer || document.getElementById('filechooser');
		// var reader = new FileReader();

		// reader.onload = function() {
		// 	importGlyphrProjectFromText(reader.result);
		// 	redraw_TestDrive();
		// };

		// reader.readAsText(f);

		debug('\t redrawing');
		redraw_TestDrive();

		debug(' coreMode_OnLoad - END\n');
	}

	/*
		readraw_TestDrive
		This function is called by the overall Redraw to update the canvas, or whatever
		content is in the main Content Area
	*/
	function redraw_TestDrive(){
		debug("\n redraw_TestDrive - START");
		_UI.redrawing = true;

		var td = _UI.testdrive;
		var ps = _GP.projectsettings;
		var txtarea = document.getElementById('tdtextarea');

		_UI.testdrive.sampletext = txtarea.value; 

		document.getElementById('tdtextarea').value = td.sampletext;
		document.getElementById('tdoptions').innerHTML = drawTDOptions();
		changefontscale(td.fontsize);

		var contentarray = td.sampletext.split('');
		contentarray = findAndMergeLigatures(contentarray);
		var tctx = td.ctx;
		var scale = td.fontscale;
		var textEm = (ps.upm*scale);
		var pagepadding = 10;
		var currx = pagepadding;
		var curry = pagepadding + (ps.ascent*scale);
		var cc, tc;

		tctx.clearRect(0,0,5000,5000);
		if(td.showhorizontals) drawLine(curry);

		debug('\t contentarray.length: ' + contentarray.length);

		for(var k=0; k<contentarray.length; k++){
			tc = contentarray[k];

			if(tc === '\n'){
				// reset X val
				currx = pagepadding;

				// calc Y val
				curry += (textEm);
				curry += ((td.linegap*1)*scale);

				// draw baseline
				if(td.showhorizontals) drawLine(curry);
			} else {
				cc = getGlyph(glyphToHex(tc));
				if(cc){
					if(td.showglyphbox){
						tctx.fillStyle = 'transparent';
						tctx.strokeStyle = _UI.colors.blue.l65;
						tctx.lineWidth = 1;

						tctx.strokeRect(
							currx.makeCrisp(),
							(curry.makeCrisp()-(ps.ascent*scale)),
							round(cc.getTotalWidth()*scale),
							round(textEm)
						);
					}

					debug('\t starting drawing ' + cc.name);
					debug(cc);

					if(_UI.testdrive.flattenglyphs){
						if(!_UI.testdrive.cache.hasOwnProperty(tc)){
							_UI.testdrive.cache[tc] = new Glyph(cc).flattenGlyph().combineAllShapes(true);
						}

						currx += _UI.testdrive.cache[tc].drawGlyph(tctx, {'dz' : td.fontscale, 'dx' : currx, 'dy' : curry}, true);

					} else {
						currx += cc.drawGlyph(tctx, {'dz' : td.fontscale, 'dx' : currx, 'dy' : curry}, true);
					}

					currx += (td.padsize*1*scale);
					currx += calculateKernOffset(tc, contentarray[k+1])*scale;
					debug('\t done drawing ' + cc.name);
				}
			}
		}

		_UI.redrawing = false;
	}

	/*
		calculateKernOffset
		Takes two glyphs as arguments, and determines the number of Em units of
		offset between them.  First checks to see if there are custom kern values
		for the pair, and if not, returns 0. Left Side Bearing and Right Side Bearing
		are not returned, only kern values.
	*/
	function calculateKernOffset(c1, c2) {
		debug('\n calculateKernOffset - START');
		debug('\t passed: ' + c1 + ' and ' + c2);

		if(!c1 || !c2) return 0;

		c1 = parseUnicodeInput(c1).join('');
		c2 = parseUnicodeInput(c2).join('');
		debug('\t converted: ' + c1 + ' and ' + c2);

		var k = _GP.kerning;
		var tlc, trc, re;

		for(var p in k){ if(k.hasOwnProperty(p)){
			for(var l=0; l<k[p].leftgroup.length; l++){
				tlc = k[p].leftgroup[l];
				debug('\t checking leftgroup ' + tlc + ' against ' + c1);
				if(parseUnicodeInput(tlc)[0] === c1){
					debug('\t LEFTGROUP MATCH! for ' + c1);
					for(var r=0; r<k[p].rightgroup.length; r++){
						trc = k[p].rightgroup[r];
						if(parseUnicodeInput(trc)[0] === c2){
							re = (k[p].value*-1);
							debug('\t FOUND MATCH! returning ' + re);
							return re;
						}
					}
				}
			}
		}}

		debug(' calculateKernOffset - END\n');
		return 0;
	}

	/*
		findAndMergeLigatures
		Takes an array of glyphs as an argument, and looks for glyph sequences
		that merge to ligatures.  Returns an array with merged results.
	*/
	function findAndMergeLigatures(carr) {
		debug('\n findAndMergeLigatures - START');
		var ligs = sortLigatures();
		debug('\t sorted ligs: ');
		debug(ligs);

		var ligchars, carrot;
		for(var c=0; c<carr.length; c++){
			// for(var g=ligs.length-1; g>-1; g--){
			for(var g=0; g<ligs.length; g++){
				ligchars = hexToGlyph(ligs[g].id);
				debug('\t checking ' + ligchars);
				carrot = carr.slice(c, (c+ligchars.length)).join('');
				debug('\t against ' + carrot);
				if(carrot === ligchars){
					carr.splice(c, ligchars.length, ligchars);
					debug('\t !Ligature Found! array['+c+'] is now ' + carr[c]);
				}
			}
		}

		debug(' findAndMergeLigatures - END\n');
		return carr;
	}

	function drawLine(y){
		debug('TESTDRIVE - Drawing h line at ' + y);
		y = y.makeCrisp();
		_UI.testdrive.ctx.strokeStyle = _UI.colors.blue.l65;
		_UI.testdrive.ctx.beginPath();
		_UI.testdrive.ctx.lineWidth = 1;
		_UI.testdrive.ctx.moveTo(0,y);
		_UI.testdrive.ctx.lineTo(_UI.testdrive.canvas.width,y);
		_UI.testdrive.ctx.stroke();
		_UI.testdrive.ctx.closePath();
	}

	function drawSampletextButtons(){
		var content = '<h3>pangrams</h3>';
		content += makeTDButton('the five boxing wizards jump quickly');
		content += makeTDButton('pack my box with five dozen liquor jugs');
		content += makeTDButton('the quick brown fox jumps over a lazy dog');
		content += makeTDButton('amazingly few discotheques provide jukeboxes');
		content += makeTDButton('quick enemy movement will<br>jeopardize six of the gunboats');
		content += '<br><h3>glyph sets</h3>';
		content += makeTDButton('abcdefghijklmnopqrstuvwxyz');
		content += makeTDButton('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
		content += makeTDButton('0123456789');
		content += makeTDSymbolButton();

		return content;
	}

	function makeTDButton(text){
		var val = text.replace('<br>', ' ');
		return '<button class="sampletext" onclick="_UI.testdrive.sampletext=\''+val+'\';redraw_TestDrive();">'+text+'</button><br>';
	}

	function makeTDSymbolButton(){
		return "<button class='sampletext' onclick='document.getElementById(\"tdtextarea\").value=\"!\\\"#$%&&#39;()*+,-./:;\\\<=\\\>?@[\\\\]^_`{|}~\";redraw_TestDrive();'>!\"#$%&&#39;()*+,-./:;\<=\>?@[\\]^_`{|}~</button><br>";
	}

	function drawTDOptions(){
		if(!_UI.testdrive.linegap) _UI.testdrive.linegap = _GP.projectsettings.linegap;
		if(!isval(_UI.testdrive.padsize)) _UI.testdrive.padsize = _GP.projectsettings.defaultlsb;

		var content = '<table class="detail">';
		content += '<tr><td> font size <span class="unit">(px)</span> </td><td><input type="number" value="'+_UI.testdrive.fontsize+'" onchange="changefontscale(this.value); redraw_TestDrive();"></td></tr>';
		content += '<tr><td> 96dpi font size <span class="unit">(pt)</span> </td><td><input type="number" disabled="disabled" id="roughptsize" valu="75"/></td></tr>';
		content += '<tr><td> line gap <span class="unit">(em units)</span> </td><td><input type="number" value="'+_UI.testdrive.linegap+'" onchange="_UI.testdrive.linegap=this.value*1; redraw_TestDrive();"></td></tr>';
		content += '<tr><td> glyph spacing <span class="unit">(em units)</span> </td><td><input type="number" value="'+_UI.testdrive.padsize+'" onchange="_UI.testdrive.padsize=this.value*1; redraw_TestDrive();"></td></tr>';
		content += '<tr><td> <label for="showglyphbox">show glyph boxes</label> </td><td>' + checkUI("_UI.testdrive.showglyphbox", _UI.testdrive.showglyphbox, true) + "</td></tr>";
		content += '<tr><td> <label for="showhorizontals">show baseline</label> </td><td>' + checkUI("_UI.testdrive.showhorizontals", _UI.testdrive.showhorizontals, true) + "</td></tr>";
		
		if(_UI.devmode) content += '<tr><td> <label for="flattenglyphs">flatten glyphs</label> </td><td>' + checkUI("_UI.testdrive.flattenglyphs", _UI.testdrive.flattenglyphs, false) + "</td></tr>";

		content += '<tr><td colspan=2><button onclick="createimg();">generate png file</button></td></tr>';
		content += '</table>';
		return content;
	}

	function changefontscale(newval){
		_UI.testdrive.fontsize = newval*1;
		_UI.testdrive.fontscale = (newval/_GP.projectsettings.upm);
		document.getElementById('roughptsize').value = (newval*0.75);
	}

	function createimg(){
		var imgd = document.getElementById('tdcanvas').toDataURL();

		var win = window.open(document.location.href, 'Glyphr Studio Test Drive');

		win.document.write('<!DOCTYPE html><html>'+
		'<head><title>Glyphr - Test Drive Image</title></head>'+
		'<body style="padding:40px; text-align:center;">'+
		'<img src="' + imgd + '" title="Glyphr Test Drive" style="border:1px solid #f6f6f6;">'+
		'</html>');
	}

	function removeEmptyStringInputs(val) {
		if(val === '""' || val === "''") return '';
		else return trim(val);
	}

	function sortLigatures() {
		var temp;
		var sortarr = [];

		for(var n in _GP.ligatures) { if(_GP.ligatures.hasOwnProperty(n)){
			temp = _GP.ligatures[n];
			sortarr.push({'id':n, 'ligature':temp});
		}}

		sortarr.sort(function(a,b){
			if(a.id && b.id){
				if(a.id.length === b.id.length){
					if (a.id > b.id) return 1;
					if (a.id < b.id) return -1;
				} else {
					return b.id.length - a.id.length;
				}
			} else return 0;
		});

		_GP.ligatures = {};

		for(var s=0; s<sortarr.length; s++){
			temp = sortarr[s];
			_GP.ligatures[temp.id] = temp.ligature;
		}

		return sortarr;
	}

	function checkUI(varname, currbool, doredraw, invert){
		//debug("CHECKUI -  varname:" + varname + " doredraw:" + doredraw);
		var idname = varname.split('.');
		idname = idname[idname.length-1];
		if(invert) currbool = !currbool;

		var re = '<input type="checkbox"';
		re += (currbool? ' checked ' : ' ');
		re += 'id="'+idname+'"';
		re += 'onclick="'+varname+' = !'+varname+';';

		if(doredraw){
			re += ' history_put(\'Toggled '+idname+': '+!currbool+'\');';
			re += ' redraw({calledby:\'checkbox '+idname+'\'});';
		}

		re += '"/>';

		return re;
	}


//-------------------
// View
//-------------------
	function setView(oa){

		// Check for which to set
		if(isval(oa.dx)){ _UI.view.dx = oa.dx; }
		if(isval(oa.dy)){ _UI.view.dy = oa.dy; }
		if(isval(oa.dz)){ _UI.view.dz = oa.dz; }

		//debug('SETVIEW - passed ' + JSON.stringify(oa) + ' selectedglyph ' + _UI.selectedglyph + ' VIEWS is\n' + JSON.stringify(_UI.views));
	}

	function getView(calledby){
		return clone(_UI.view);
	}


//	-----------------------------------------------
//	Convert between Saved values and Canvas values
//	-----------------------------------------------
	//convert stored x-y coord to canvas x-y
	function sx_cx(sx){
		var v = getView('sx_cx');
		var canvasx = v.dx;
		canvasx += (sx*v.dz);
		return canvasx || v.dx;
	}

	function sy_cy(sy){
		var v = getView('sy_cy');
		var canvasy = v.dy;
		canvasy -= (sy*v.dz);
		return canvasy || v.dy;
	}

	//convert canvas x-y inputs to saved shape x-y
	function cx_sx(cx){
		var v = getView('cx_sx');
		return ((cx-v.dx)/(v.dz));
	}

	function cy_sy(cy){
		var v = getView('cy_sy');
		return ((v.dy-cy)/(v.dz));
	}


//	--------------------------
//	Hex Conversion Functions
//	--------------------------
	function decToHex(d) { var dr = Number(d).toString(16); while(dr.length < 4) { dr = '0'+dr; } return '0x'+dr.toUpperCase(); }

	function decToHTML(d) { return hexToHTML(decToHex(d)); }

	function glyphToHex(s) {
		var result = '';
		for(var i=0; i<s.length; i++) result += decToHex(String(s).charCodeAt(i));
		return result;
	}

	function glyphToHexArray(s) {
		var result = [];
		for(var i=0; i<s.length; i++) result.push(decToHex(String(s).charCodeAt(i)));
		return result;
	}

	function hexToGlyph(u) {
		if(String(u).charAt(1) !== 'x') u = String(decToHex(u));
		// debug('\n hexToGlyph - START');
		// debug('\t passed ' + u + ' which is a ' + typeof u);
		u = u.split('0x');
		var result = '';
		for(var i=0; i<u.length; i++){ if(u[i] !== ''){
			u[i] = String.fromCharCode('0x'+u[i]);
			// debug('\t added ' + u[i]);
			if(u[i]) result += u[i];
		}}
		// debug(' hexToHTML - END\n');
		return result;
	}

	function hexToHTML(h) {
		// debug('\n hexToHTML - START');
		// debug('\t passed ' + h);
		if(!h || h.indexOf('0x') < 0) return false;

		h = String(h).split('0x');
		var result = '';
		for(var i=0; i<h.length; i++){ if(h[i] !== ''){
			h[i] = ('0x'+h[i]);
			h[i] = parseInt(h[i],16);
			if(h[i]) result += ('&#'+h[i]+';');
		}}
		return result;
	}

	function hexToUnicodeHex(h){
		return (h.replace(/0x/, '&#x') + ';');
	}

	function parseUnicodeInput(str) {
		// takes any kind or number of input
		// Unicode, Hex, or glyph
		// and returns an array of padded hex values

		// debug('\n parseUnicodeInput - START');
		// debug('\t passed ' + str);

		if(!str) return false;

		var entries = [];
		var results = [];

		var prefix = str.substr(0,2);
		if(isInputUnicode(str)) {
			str = str.replace(/u\+/g, 'U+');
			entries = str.split('U+');
		} else if (isInputHex(str)) {
			str = str.replace(/0X/g, '0x');
			entries = str.split('0x');
		} else {
			return glyphToHexArray(str);
		}

		var te;
		for(var e=0; e<entries.length; e++){
			te = entries[e];
			te = te.replace(/;/g, '');
			if(te !== ''){
				while(te.length < 4) te = '0'+te;
				te = ('0x'+te.toUpperCase());
				// debug('\t parsed ' + e + ' as ' + te);
				results.push(te);
			}
		}

		// debug('\t returning ' + JSON.stringify(results));
		// debug('parseUnicodeInput - END\n');
		return results;
	}

	function isInputUnicode(str) {
		str = str.replace(/u\+/g, 'U+');
		var count = 0;
		var pos = str.indexOf('U+');
		while(pos !== -1){
			count ++;
			pos = str.indexOf('U+', pos+2);
		}
		return count;
	}

	function isInputHex(str) {
		str = str.replace(/0X/g, '0x');
		var count = 0;
		var pos = str.indexOf('0x');
		while(pos !== -1){
			count ++;
			pos = str.indexOf('0x', pos+2);
		}
		return count;
	}
