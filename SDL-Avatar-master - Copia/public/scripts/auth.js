
var USER = JSON.parse(document.getElementById('user').value);

function checkBlueGroup(){
    var authenticated = false;
    for(var group of USER.blueGroups){
        if(group.name === "SDLGroup"){
            authenticated = true;
            break;
        }
    }
    if(authenticated){
        console.log('Authenticated');
        setSession('userSDL', JSON.stringify(USER));
        window.location.href = '/home';
    }else{
        deleteSession('userSDL');
        alert('Usuario não autorizado!')
        window.location.href = '/';
    }
}


checkBlueGroup();
