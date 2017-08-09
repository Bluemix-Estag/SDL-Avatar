


function typeWriter(text, i, callback) {

    if (i < (text.length)) {
        document.querySelector("h4").innerHTML = text.substring(0, i + 1) + '<span aria-hidden="true" id="caret"></span>';
        setTimeout(function () {
            typeWriter(text, i + 1, callback)
        }, 50);
    } else {
        callback();
    }

}

function StartTextAnimation(text) {
    $('#gif-holder').removeClass('hide');
    typeWriter(text, 0, function () {
        $('#gif-holder').addClass('hide');
    });

}





var params = {},
    watson = 'Watson',
    context = {};


function userMessage(message) {

    params.text = message;
    if (context) {
        params.context = context;
    }
    var xhr = new XMLHttpRequest();
    var uri = '/api/watson';
    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
        // Verify if there is a success code response and some text was sent
        if (xhr.status === 200 && xhr.responseText) {
            var response = JSON.parse(xhr.responseText);
            text = response.output.text; // Only display the first response
            context = response.context; // Store the context for next round of questions
            console.log("Got response from Ana: ", JSON.stringify(response));

            // Aqui faz a parte do in progress e flags do conversation;
            if (context.system.dialog_stack[0].state != 'in_progress' && context.search == true) {
                console.log('Entrou');
                var name = context.produto;
                var list = context.listas;
                xhrGet('/getProjects?name=' + name + '&list=' + list, function (result) {
                    // console.log('Resposta:' + JSON.stringify(result));
                    console.log(result.quantity)
                    context.resposta = (result.quantity == 0) ? false : true;
                    context.quantity = result.quantity;
                    context.erroTipo = null;
                    context.search = false;
                    userMessage('');

                    for(var c of result.projects){

                      var teste1 = c['Part Number'];
                      var teste2 = c['Part Description'];
                      var teste3 = c['Quantity'];

                      var content_main = '<tr><td class="flow-text">'+teste1+'</td><td class="flow-text">'+teste2+'</td><td class="flow-text">'+teste3+'</td></tr>';
                      $('#modal-body').append(content_main);
                    }
                    var content_bottom = '<tr><td><span><div id="lindo"></div></span></td><td><span> </span></td><td><span> </span></td></tr>';
                    $('#modal-body').append(content_bottom);




                                        setTimeout(function(){
                                          $('#ref-btn').removeClass('hide');
                                          $('#ref-btn').addClass('animated bounceInUp');

                                        },2000);


                                        $('#ref-btn').on('click',function(){
                                          $('.modal').modal();
                                          $('#modal1').modal('open');


                                            var size = document.getElementById('testee').clientHeight;
                                            $('#lindo').css('margin-top', size);

                                        })
                }, function (error) {
                    context.resposta = false;
                });
            } else {

            }


            for (var txt in text) {
                if (text.length > 1 && txt >= 1) {
                    setTimeout(function () {
                        displayMessage(text[txt], watson);
                    }, text[txt].length * 60);
                } else {
                    displayMessage(text[txt], watson);
                }


            }

        } else {
            console.error('Server error for Conversation. Return status of: ', xhr.statusText);
            displayMessage("Um erro ocorreu.Tente novamente mais tarde.", watson);
        }
    };
    xhr.onerror = function () {
        console.error('Network error trying to send message!');
        displayMessage("Meu servidor está offline. Espere alguns instantes para continuar por favor.", watson);
    };
    // console.log(JSON.stringify(params));
    xhr.send(JSON.stringify(params));
}


function newEvent(event) {
    // Only check for a return/enter press - Event 13
    if (event.which === 13 || event.keyCode === 13) {
        var userInput = document.getElementById('chatInput');
        text = userInput.value; // Using text as a recurring variable through functions
        text = text.replace(/(\r\n|\n|\r)/gm, ""); // Remove erroneous characters
        // If there is any input then check if this is a claim step
        // Some claim steps are handled in newEvent and others are handled in userMessage
        if (text) {
            // Display the user's text in the chat box and null out input box
            //            userMessage(text);
            // displayMessage(text, 'user');
            userInput.value = '';
            userMessage(text);
            $('#ref-btn').removeClass('animated bounceInUp');
            $('#ref-btn').addClass('hide');
            $('#modal-body').html('');
        } else {
            // Blank user message. Do nothing.
            console.error("No message.");
            userInput.value = '';
            return false;
        }
    }
}

function displayMessage(text, user) {

    StartTextAnimation(text.trim());
}

$(document).ready(function () {
    if (sessionCheck('userSDL')) {
        var user = JSON.parse(getSession('userSDL'));

        context['firstname'] = user.firstName;
        userMessage('');
    } else {
        window.location.href = '/login';
    }

})
