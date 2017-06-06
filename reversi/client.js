const socket = io()
let state = {}

const setState = updates => {
    Object.assign(state, updates)
    render();
}
function render() {
    ReactDOM.render(React.createElement(Root, state), document.getElementById('root'))
}

var getClientID = false;
var clientID = "#";
var getOpponent = false;
var opponent = "#";
var gameID = "#";
var turn = "#";
var getBoardNow = false;

var message1 = 'You have been assigned a <b>Client No. of ';
var message2 = ' (BLUE)</b>. As soon as another client joins (RED), you will be up for a match.';
var message3 = 'Hello <b>Client No. ';
var message4 = '</b>. You are up against <b>Client No. ';
var message5 = '</b>.';

var displayMessage;

var gameOver = false;

var gameMatrix = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 3, 0, 0, 0],
    [0, 0, 0, 3, 2, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
];

socket.on('to_client', 
    function (data) {
        console.log('server responded:', data);

        // GET CLIENT AND OPPONENT IDS
        // INITIAL STAGE ONLY
        if (getClientID==false) {
            getClientID = true;
            clientID = data.split("CLIENTID=");
            clientID = clientID[1];
            displayMessage = message1.concat(clientID, message2);
        }
        else if (getClientID==true && getOpponent==false) {
            if (data.search('OPPONENTID=') !== -1) {
                getOpponent = true;
                opponent = data.split("OPPONENTID=");
                opponent = opponent[1];
                displayMessage = message3.concat(clientID, message4, opponent, message5);
            }
        }

        // GET GAME MESSAGES: TURN AND MATRIX
        // WILL CONTINUE AS GAME PROCEEDS
        if (getClientID && getOpponent) {
            
            gameID = 'GAMEID='.concat(Math.ceil(clientID/2));

            if (getBoardNow) {
                getBoardNow = false;
                if (data[0][0] >= 0 && data[0][0] <= 3) {
                    console.log('received matrix');
                    console.log(data);
                    gameMatrix = data;
                    generateValid(turn);
                }
            }
            else if (data.search('TURN=') !== -1) {
                turn = data.split('TURN=');
                turn = turn[1];
                getBoardNow = true;
            }
            else if (data.search('WIN=') !== -1) {
                winMsg = data.split('&');
                winnerInfo = winMsg[0].split('WIN=');
                winnerInfo = winnerInfo[1];

                winReason = winMsg[1].split('REASON=');
                winReason = winReason[1];

                if (winnerInfo=='DRAW') {
                    displayMessage = 'Game drawn. Both captured equal number of boxes.';
                }
                else {
                    displayMessage = 'Client No. '.concat(winnerInfo, ' won. ', winReason);
                }
                gameOver = true;
                getBoardNow = true; // display ending board configuration
            }
        }
        
        render();
    }
)

function handleClick(y) {
    clickedSquare = y.target.getAttribute('name');
    clientMove = gameID.concat('&TURN=', turn, '&MOVE=', clickedSquare);
    console.log('this is:', clientMove);
    socket.emit('to_server', clientMove);
}


const Root = ({message, msgList}) =>
    React.createElement('div', {className: 'container'},

        // HEADER START
        React.createElement('div', {className: 'container'},
            React.createElement('nav', {},
                React.createElement('ul', {className: 'nav nav-pills pull-right'},
                    React.createElement('li', {className: 'active'},
                        React.createElement('a', {href: '#'}, 'Play Mode')
                    ),
                    React.createElement('li', {},
                        React.createElement('a', {href: 'view.html'}, 'View Mode')
                    )
                )
            ),
            React.createElement('h3', {className: 'text-muted'}, 'Reversi')
        ),
        // HEADER END

        // SHOW MESSAGES
        React.createElement('div', {className: 'row marketing'}, 
            React.createElement('div', {className: 'col-lg-6'},
                React.createElement('h4', {}, 'Welcome!'),
                React.createElement('p', {}, displayMessage)
            )
        ),
        // END SHOW MESSAGES

        // GENERATE GRID
        React.createElement('div', {className: 'row marketing'}, generateGrid(gameMatrix)),
        // END GENERATE GRID

        // FOOTER START
        React.createElement('footer', {className: 'footer'},
            React.createElement('p', {}, '&copy; 2017 Usama Muneeb')
        )
        // FOOTER END
)

setState({message: '', msgList: []})




function generateGrid (gameMatrix) {
    var rowObject;
    gridHTML = [];
    rowElements = [];

    var row_letter;

    for(row = 0; row < 8; ++row){
        row_letter = String.fromCharCode('a'.charCodeAt(0) + row);

        // generate the children (grid boxes) for a row
        for (col = 0; col < 8; ++col) {
            gridLocation = row_letter.concat(col+1);
            //console.log(gridLocation);

            if (gameMatrix[row][col]==0) { // invalid move BOX
                rowElements.push(React.createElement('input',
                    { type: 'submit', className: 'btn btn-lg btn-default', name: gridLocation,
                      style: {height: '64px', width: '64px'}, value: 'X', disabled: true }
                ))
            }
            else if (gameMatrix[row][col]==1) { // valid move BOX
                if (gameOver) {
                    rowElements.push(React.createElement('input',
                        { type: 'submit', className: 'btn btn-lg btn-default', name: gridLocation,
                        style: {height: '64px', width: '64px'}, value: 'X', disabled: true }
                    ))
                }
                else {
                    rowElements.push(React.createElement('input',
                        { type: 'submit', className: 'btn btn-lg btn-warning', name: gridLocation,
                        style: {height: '64px', width: '64px'}, value: 'X', onClick: (x) => handleClick(x) }
                    ))
                }
            }
            else if (gameMatrix[row][col]==2) { // DARK LIVES there
                rowElements.push(React.createElement('input',
                    { type: 'submit', className: 'btn btn-lg btn-primary', name: gridLocation,
                      style: {height: '64px', width: '64px'}, value: 'X' }
                ))
            }
            else if (gameMatrix[row][col]==3) { // LIGHT LIVES there
                rowElements.push(React.createElement('input',
                    { type: 'submit', className: 'btn btn-lg btn-danger', name: gridLocation,
                      style: {height: '64px', width: '64px'}, value: 'X' }
                ))
            }
        }

        rowObject = React.createElement('div', {id: 'row1'}, rowElements);
        rowElements = [];
        gridHTML.push(rowObject);
    }

    return gridHTML;
}

function generateValid(turn) {
    var client;
    var opponent;

    // which player is current player in Matrix
    if (turn % 2 == 1) {
        client = 2; opponent = 3;
    }
    else {
        client = 3; opponent = 2;
    }
    
    if (turn==clientID) {
        for (r=0; r<8; ++r) {
            for (c=0; c<8; ++c) {

                if (gameMatrix[r][c] == client) {
                    //gameMatrix[r][c] = 1;
                    divergeFromhere(r, c, client, opponent);
                }
            }
        }
    }
}

function divergeFromhere(r, c, client, opponent) {
    probeDirection(r, c, client, opponent, 1, 0); // right
    probeDirection(r, c, client, opponent, -1, 0); // left
    probeDirection(r, c, client, opponent, 0, 1); // top
    probeDirection(r, c, client, opponent, 0, -1); // bottom

    probeDirection(r, c, client, opponent, 1, 1); // top-right
    probeDirection(r, c, client, opponent, -1, -1); // bottom-left
    probeDirection(r, c, client, opponent, -1, 1); // top-left
    probeDirection(r, c, client, opponent, 1, -1); // bottom-right
}

function probeDirection(r, c, client, opponent, x_incr, y_incr) {
    var row=r, col=c;
    
    do {
        row = row + y_incr;
        col = col + x_incr;

    } while (row > -1 && row < 8 && col > -1 && col < 8 && gameMatrix[row][col]==opponent);

    if (row > -1 && row < 8 && col > -1 && col < 8) {
        if (gameMatrix[row][col]==0) {
            if (Math.abs(row - r) > 1 || Math.abs(col - c) > 1) {
                gameMatrix[row][col] = 1;
            }
        }
    }
}