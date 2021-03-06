//deletes cached password after 5 minutes unless reset
chrome.runtime.onMessage.addListener(
      function (request, sender, sendResponse) {
			if(request.message == "reset_timer"){
				resetPwdTimer();			//reset timer to erase cached Master Password
				
			}else if(request.message == "reset_now"){ 
				resetNow();					//same but effective immediately
			
			}else if(request.message == "preserve_master"){				//cache SynthPass master Password
			   masterPwd = request.masterPwd;
			   resetPwdTimer()

			}else if(request.message == "retrieve_master"){
				chrome.runtime.sendMessage({message: 'master_fromBg', masterPwd: masterPwd});
				resetPwdTimer()
			}
      }
);

var masterPwd,
	pwdTimer = 0;
	
function resetPwdTimer(){
	var period  = 300000;
	clearTimeout(pwdTimer);
	pwdTimer = setTimeout(function(){
		resetNow();
		chrome.runtime.sendMessage({message: 'delete_master'})		//also delete in popup
	}, period)
}

function resetNow(){
	masterPwd = ''
}

//this one for links by right-click
function openLink(info,tab){
	if(info.linkUrl) chrome.tabs.create({url: '../html/pagecage.html#' + info.linkUrl});
}

chrome.contextMenus.create({
	title: "Open Link in Cage", 
	contexts:["selection"], 
	onclick: openLink
});