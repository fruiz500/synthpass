// This is the main code for SynthPass

//global variables that will be used in computations
var websiteName, pwdNumber;

//gets executed with the OK button
function doStuff(e) {
	var pwdStr1 = masterPwd1.value.trim(),			//get passwords and serials
		serialStr1 = serial1.value.trim(),
		pwdStr2 = masterPwd2.value.trim(),
		serialStr2 = serial2.value,					//not trimmed so spaces mean "no serial" rather than "repeat serial"
		pwdStr3 = masterPwd3.value.trim(),
		serialStr3 = serial3.value,
		pwdStr4 = masterPwd4.value.trim(),
		serialStr4 = serial4.value,
		userStr = userName.value.trim();
		
	if(pwdTable.style.display == 'block' && !pwdStr1){						//no password in box
		mainMsg.textContent = "Please enter something or click Cancel";
		return
	}else if(pwdNumber == 1 && serialStr1 == '-'){							//raw password to be used, send user back to webpage
		mainMsg.textContent = "If you do not want to synthesize the password, better to enter it directly on the webpage";
		serial1.value = '';
		return
	}
	mainMsg.innerHTML = '<span class="blink">PROCESSING</span>';				//Get blinking message started
	
  setTimeout(function(){														//the rest after a 0 ms delay
	if(pwdTable.style.display == 'block'){					//do passwords if the boxes are displayed, otherwise, just userName
		var pwdOut = [],			//compute the new password into an array
			newPwd = pwdSynth(pwdStr1,serialStr1);
		pwdOut.push(newPwd);
	
	//fill missing inputs and compute the rest of the passwords
		if(pwdNumber > 1){
			if(!pwdStr2) pwdStr2 = pwdStr1;
			if(!serialStr2){serialStr2 = serialStr1}else{serialStr2 = serialStr2.trim()};
			newPwd = (serialStr2 == serialStr1) && (pwdStr2 == pwdStr1) ? pwdOut[0] : pwdSynth(pwdStr2,serialStr2);
			pwdOut.push(newPwd)
		}
		if(pwdNumber > 2){
			if(!pwdStr3) pwdStr3 = pwdStr2;
			if(!serialStr3){serialStr3 = serialStr2}else{serialStr3 = serialStr3.trim()};
			newPwd = (serialStr3 == serialStr2) && (pwdStr3 == pwdStr2) ? pwdOut[1] : pwdSynth(pwdStr3,serialStr3);
			pwdOut.push(newPwd)
		}
		if(pwdNumber > 3){
			if(!pwdStr4) pwdStr4 = pwdStr3;
			if(!serialStr4){serialStr4 = serialStr3}else{serialStr4 = serialStr4.trim()};
			newPwd = (serialStr4 == serialStr3) && (pwdStr4 == pwdStr3) ? pwdOut[2] : pwdSynth(pwdStr4,serialStr4);
			pwdOut.push(newPwd)
		}
	  }
		//send new passwords to page
		if(userTable.style.display == 'block'){
    		chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_OK", "passwords": pwdOut, "userName": userStr})
		}else{
			chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_OK", "passwords": pwdOut})
		}
		
		setTimeout(function(){				//close window after 2 seconds in case the content script does not reply
		  window.close();
	  	}, 2000)
  },0);
}

//synthesizes a new password
function pwdSynth(pwd, serial){
	if(serial == '-'){							//special case using the Master Password directly
		return pwd
	}else{							//the replaces are to add generally accepted special characters
		return nacl.util.encodeBase64(wiseHash(pwd,websiteName + serial)).replace(/[+/=]/g,'_').replace(/[Aa]/,'!').replace(/[Bb]/,'@').replace(/[Cc]/,'#')
	}
}

var bgPage = chrome.extension.getBackgroundPage();			//to cache the master password

//what happens when the content script sends something back
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
	  
	if( request.message === "start_info" ) {							//initial message
	  var hostParts = request.host.split('.');						//get name of the website, ignoring subdomains
	  if(hostParts[hostParts.length - 1].length == 2 && hostParts[hostParts.length - 2].length < 4){			//domain name with second-level suffix
		  	websiteName = hostParts.slice(-3).join('.')
	  }else{
	  		websiteName = hostParts.slice(-2).join('.')				//normal domain name
	  }
	  pwdNumber = request.number;
	  isUserId = request.isUserId	;
	  
	  if(isUserId){								//userId field found, so display box, filled from storage
	  		userTable.style.display = 'block';
			okBtn.style.display = '';
			mainMsg.textContent = "I cannot see a password to be filled, but there is an input that might take a user name"
	  }
			
	  if(pwdNumber){					             //password boxes found, so display the appropriate areas and load serial into first box
		  pwdTable.style.display = 'block';
		  okBtn.style.display = '';		  
		  if(pwdNumber == 1){						//only one password box: display single input
		  	var prevPwd = bgPage.masterPwd;
			if(prevPwd){
				showPwdMode1.style.display = 'none';
				ShowLabel.style.display = 'none';
				masterPwd1.value = prevPwd;
				setTimeout(function(){mainMsg.textContent = "Master Password still active; click OK"},30)
			}else{
				mainMsg.textContent = "Enter Master Password and optional serial, click OK"
			}
		  }else if(pwdNumber >= 2){				//2 password boxes: display two inputs and load serial on top box	  
			  mainMsg.textContent = "Move the serial if the old password is not first";
			  row2.style.display = '';
			  if(pwdNumber >= 3){					//3 boxes
				  row3.style.display = '';
				  if(pwdNumber == 4){				//4 boxes, which is the max
					  row4.style.display = '';
				  }else if(pwdNumber >= 5){		//too many boxes
					  pwdTable.style.display = 'none';
		  			  okBtn.style.display = 'none';
					  mainMsg.textContent = "Too many password fields. Try filling them manually";
				  }
			  }	  
		  }
		  masterPwd1.focus()
	  }

	  //now get the serial from storage, and put it in the first serial box, and the userName in its place
	  chrome.storage.sync.get(websiteName, function (obj){
		var serialData = obj[websiteName];
		if(serialData){
			if(serialData[0]) serial1.value = serialData[0]	;		//populate serial box
			if(serialData[1]) userName.value = serialData[1]		//and user ID regardless of whether it is displayed
		}
	  });
	  
	  //close everything and erase cached Master Password after five minutes
	  setTimeout(function(){
		  bgPage.masterPwd = '';
		  window.close();
	  }, 300000)
    }

 	if( request.message === "done" ) {				//done, so store the serial, if any, of the password that has focus, plus the user name
    	var	serialStr = document.getElementById("serial" + lastFocus).value,
			userStr = userName.value;
		
		if(serialStr == '' && userStr == ''){					//delete entry if empty
			chrome.storage.sync.remove(websiteName);
		}else{													//otherwise store serial and user name
			var jsonfile = {};
			jsonfile[websiteName] = [serialStr,userName.value];		//userName may have been edited
    		chrome.storage.sync.set(jsonfile)
		}

		var	pwdStr = document.getElementById("masterPwd" + lastFocus).value;
		if(pwdStr){
			bgPage.masterPwd = pwdStr;					//store master password between popup loads; auto timer is set in bodyscript.js
			bgPage.pwdTime = new Date().getTime()
		}else{
			bgPage.masterPwd = ''
		}
		chrome.runtime.sendMessage({"message": "reset_timer"});			//reset auto timer on background page

		window.close()
	}
  }
)


//fetches userId and displays in box so it can be added
function fetchUserId(){
	userTable.style.display = 'block';
	okBtn.style.display = '';
	mainMsg.textContent = "There was no user ID stored";

	//now get the userName from storage, and put it in its place
	chrome.storage.sync.get(websiteName, function (obj){
		var serialData = obj[websiteName];
		if(serialData){
			if(serialData[1]) userName.value = serialData[1]		//fill user ID
		}
		mainMsg.textContent = "Click OK to put it in the page"
	})
}

//these are for showing and hiding text in the Password boxes
function showPwd1(){
	if(showPwdMode1.checked){
		masterPwd1.type = "text"
	}else{
		masterPwd1.type = "password"
	}
}
function showPwd2(){
	if(showPwdMode2.checked){
		masterPwd2.type = "text"
	}else{
		masterPwd2.type = "password"
	}
}
function showPwd3(){
	if(showPwdMode3.checked){
		masterPwd3.type = "text"
	}else{
		masterPwd3.type = "password"
	}
}
function showPwd4(){
	if(showPwdMode4.checked){
		masterPwd4.type = "text"
	}else{
		masterPwd4.type = "password"
	}
}

var lastFocus = '1';			//default is first row

//displays Keys strength and executes on Enter
function pwdKeyup(evt){
	evt = evt || window.event;
	var key = evt.keyCode || evt.which || evt.keyChar,
		pwdBox = document.activeElement;
	lastFocus = pwdBox.id.slice(-1);					//get last focused row
	if(!pwdBox.value){									//display Show label and checkbox if empty (hidden for cached password)
		ShowLabel.style.display = '';
		showPwdMode1.style.display = ''
	}
	if(key == 13){doStuff()} else{
		 if(pwdBox.value) return keyStrength(pwdBox.value,true)
	}
}
function userKeyup(evt){
	evt = evt || window.event;
	var key = evt.keyCode || evt.which || evt.keyChar;
	if(key == 13) doStuff()
}

//stretches a password string with a salt string to make a 256-bit Uint8Array Key
function wiseHash(pwd,salt){
	var iter = keyStrength(pwd,false),
		secArray = new Uint8Array(32),
		keyBytes;

	scrypt(pwd,salt,iter,8,32,0,function(x){keyBytes=x;});		//does a variable number of rounds of scrypt, using nacl libraries

	for(var i=0;i<32;i++){
			secArray[i] = keyBytes[i]
	}
	return secArray
}

//The rest is modified from WiseHash. https://github.com/fruiz500/whisehash
//function to test key strength and come up with appropriate key stretching. Based on WiseHash
function keyStrength(pwd,display) {
	if(pwd){
		var entropy = entropycalc(pwd);
	}else{
		mainMsg.textContent = 'Type your Master Password in the box';
		return
	}
	
  if(display){
	if(entropy == 0){
		var msg = 'This is a known bad password!';
		var colorName = 'magenta'
	}else if(entropy < 20){
		var msg = 'Terrible!';
		var colorName = 'magenta'
	}else if(entropy < 40){
		var msg = 'Weak!';
		var colorName = 'red'
	}else if(entropy < 60){
		var msg = 'Medium';
		var colorName = 'orange'
	}else if(entropy < 90){
		var msg = 'Good!';
		var colorName = 'green'
	}else if(entropy < 120){
		var msg = 'Great!';
		var colorName = 'blue'
	}else{
		var msg = 'Overkill  !';
		var colorName = 'cyan'
	}
  }

	var iter = Math.max(1,Math.min(20,Math.ceil(24 - entropy/5)));			//set the scrypt iteration exponent based on entropy: 1 for entropy >= 120, 20(max) for entropy <= 20
		
	msg = 'entropy ' + Math.round(entropy*100)/100 + ' bits. ' + msg;
	
	if(display){
		mainMsg.innerHTML = "<span id='pwdMsg'>" + msg + "</span>";
		document.getElementById('pwdMsg').style.color = colorName;
	}
	return iter
};

//takes a string and calculates its entropy in bits, taking into account the kinds of characters used and parts that may be in the general wordlist (reduced credit) or the blacklist (no credit)
function entropycalc(pwd){

//find the raw Keyspace
	var numberRegex = new RegExp("^(?=.*[0-9]).*$", "g");
	var smallRegex = new RegExp("^(?=.*[a-z]).*$", "g");
	var capRegex = new RegExp("^(?=.*[A-Z]).*$", "g");
	var base64Regex = new RegExp("^(?=.*[/+]).*$", "g");
	var otherRegex = new RegExp("^(?=.*[^a-zA-Z0-9/+]).*$", "g");

	pwd = pwd.replace(/\s/g,'');										//no credit for spaces

	var Ncount = 0;
	if(numberRegex.test(pwd)){
		Ncount = Ncount + 10;
	}
	if(smallRegex.test(pwd)){
		Ncount = Ncount + 26;
	}
	if(capRegex.test(pwd)){
		Ncount = Ncount + 26;
	}
	if(base64Regex.test(pwd)){
		Ncount = Ncount + 2;
	}
	if(otherRegex.test(pwd)){
		Ncount = Ncount + 31;											//assume only printable characters
	}

//start by finding words that might be on the blacklist (no credit)
	var pwd = reduceVariants(pwd);
	var wordsFound = pwd.match(blackListExp);							//array containing words found on the blacklist
	if(wordsFound){
		for(var i = 0; i < wordsFound.length;i++){
			pwd = pwd.replace(wordsFound[i],'');						//remove them from the string
		}
	}

//now look for regular words on the wordlist
	wordsFound = pwd.match(wordListExp);									//array containing words found on the regular wordlist
	if(wordsFound){
		wordsFound = wordsFound.filter(function(elem, pos, self) {return self.indexOf(elem) == pos;});	//remove duplicates from the list
		var foundLength = wordsFound.length;							//to give credit for words found we need to count how many
		for(var i = 0; i < wordsFound.length;i++){
			pwd = pwd.replace(new RegExp(wordsFound[i], "g"),'');									//remove all instances
		}
	}else{
		var foundLength = 0;
	}

	pwd = pwd.replace(/(.+?)\1+/g,'$1');								//no credit for repeated consecutive character groups

	if(pwd != ''){
		return (pwd.length*Math.log(Ncount) + foundLength*Math.log(wordLength + blackLength))/Math.LN2
	}else{
		return (foundLength*Math.log(wordLength + blackLength))/Math.LN2
	}
}

//take into account common substitutions, ignore spaces and case
function reduceVariants(string){
	return string.toLowerCase().replace(/[óòöôõo]/g,'0').replace(/[!íìïîi]/g,'1').replace(/[z]/g,'2').replace(/[éèëêe]/g,'3').replace(/[@áàäâãa]/g,'4').replace(/[$s]/g,'5').replace(/[t]/g,'7').replace(/[b]/g,'8').replace(/[g]/g,'9').replace(/[úùüû]/g,'u');
}