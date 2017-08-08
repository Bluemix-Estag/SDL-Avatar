//utilities
function createXHR(){
	if(typeof XMLHttpRequest != 'undefined'){
		return new XMLHttpRequest();
	}else{
		try{
			return new ActiveXObject('Msxml2.XMLHTTP');
		}catch(e){
			try{
				return new ActiveXObject('Microsoft.XMLHTTP');
			}catch(e){}
		}
	}
	return null;
}
function xhrGet(url, callback, errback){
	var xhr = new createXHR();
	xhr.open("GET", url, true);
	xhr.onreadystatechange = function(){
		if(xhr.readyState == 4){
			if(xhr.status == 200){
				callback(parseJson(xhr.responseText));
			}else{
				errback(JSON.parse(xhr.responseText));
			}
		}
	};
	
	xhr.timeout = 100000;
	xhr.ontimeout = errback;
	xhr.send();
}
function xhrPut(url, data, callback, errback){
	var xhr = new createXHR();
	xhr.open("PUT", url, true);
	xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhr.onreadystatechange = function(){
		if(xhr.readyState == 4){
			if(xhr.status == 200){
				callback();
			}else{
				errback('service not available');
			}
		}
	};
	xhr.timeout = 100000;
	xhr.ontimeout = errback;
	xhr.send(objectToQuery(data));
}

function xhrAttach(url, data, callback, errback)
{
	var xhr = new createXHR();
	xhr.open("POST", url, true);
	//xhr.setRequestHeader("Content-type", "multipart/form-data");
	xhr.onreadystatechange = function(){
		if(xhr.readyState == 4){
			if(xhr.status == 200){
				callback(parseJson(xhr.responseText));
			}else{
				errback('service not available');
			}
		}
	};
	xhr.timeout = 1000000;
	xhr.ontimeout = errback;
	xhr.send(data);
}

function xhrPost(url, data, callback, errback){
	var xhr = new createXHR();
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json");
	xhr.onreadystatechange = function(){
		if(xhr.readyState == 4){
			if(xhr.status == 200){
				callback(parseJson(xhr.responseText));
			}else{
				// errback(JSON.parse(xhr.responseText));
				errback(xhr.responseText);
			}
		}
	};
	xhr.timeout = 100000;
	xhr.ontimeout = errback;
	xhr.send(JSON.stringify(data));
}

function xhrDelete(url, callback, errback){	
	var xhr = new createXHR();
	xhr.open("DELETE", url, true);
	xhr.onreadystatechange = function(){
		if(xhr.readyState == 4){
			if(xhr.status == 200){
				callback();
			}else{
				errback('service not available');
			}
		}
	};
	xhr.timeout = 100000;
	xhr.ontimeout = errback;
	xhr.send();
}

function parseJson(str){
	return window.JSON ? JSON.parse(str) : eval('(' + str + ')');
}

function objectToQuery(map){
	var enc = encodeURIComponent, pairs = [];
	for(var name in map){
		var value = map[name];
		var assign = enc(name) + "=";
		if(value && (value instanceof Array || typeof value == 'array')){
			for(var i = 0, len = value.length; i < len; ++i){
				pairs.push(assign + enc(value[i]));
			}
		}else{
			pairs.push(assign + enc(value));
		}
	}
	return pairs.join("&");
}



function setSession(name, value) {
	if (typeof(Storage) !== "undefined") {
		// Code for localStorage/sessionStorage.
		sessionStorage.setItem(name, value);
	}
	else {
		// Sorry! No Web Storage support.. use cookie instead..
		setCookie(name, value);

	}
}


function setCookie(cname, cvalue) {
	var d = new Date();
	d.setTime(d.getTime() + (1 * 24 * 60 * 60 * 1000));
	var expires = "expires=" + d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}


function getSession(name) {
	if (typeof(Storage) !== "undefined") {
		// Code for localStorage/sessionStorage.
		return sessionStorage.getItem(name);
	}
	else {
		// Sorry! No Web Storage support.. use cookie instead..
		return getCookie(name);
	}
}



function sessionCheck(name) {
	
	if (typeof(Storage) !== "undefined") {
		if(sessionStorage.getItem(name)){
			return true;
		}
		return false;
		// return sessionStorage.user != null && sessionStorage.user != '' && sessionStorage.user !== "undefined";
	}
	else {
		//No storage , use cookie..
		return checkCookie(name);
	}
}



function getCookie(cname) {
	name = name + "=";
	var decodedCookie = decodeURIComponent(document.cookie);
	var ca = decodedCookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";

}

function checkCookie(cname) {
	var username = getCookie(cname);

	if (username != "" && username != null) {
		return true;
	}
	else {
		return false;
	}
}

function deleteSession(name) {
	if (typeof(Storage) !== "undefined") {
		sessionStorage.removeItem(name);
	}
	else {
		deleteCookie(name);
	}
}

function deleteCookie(cname) {
	document.cookie = cname + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

