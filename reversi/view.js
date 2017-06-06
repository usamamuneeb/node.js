const socket = io()
let state = {}

const setState = updates => {
    Object.assign(state, updates)
    render();
}
function render() {
    ReactDOM.render(React.createElement(Root, state), document.getElementById('root'))
}

var gameListGet = false;
var gameCaught = false;
var numGames = 5;

var getClientID = false;
var clientID = "#";
var getOpponent = false;
var opponent = "#";
var gameID = "#";
var turn = "#";
var getBoardNow = false;

var message1 = 'Hello <b>Viewer No. ';
var message2 = '</b>. Please select a game.';

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

        // GET GAME MESSAGES: TURN AND MATRIX
        // WILL CONTINUE AS GAME PROCEEDS
        console.log('received matrix');
        console.log(data);
        gameMatrix = data;
        generateValid(turn);
        
        render();
    }
)

function handleClick(y) {
    clickedGame = y.target.getAttribute('name');

    if (clickedGame.search('LIST') !== -1 ){
        socket.emit('to_server', 'GETLIST'.concat('&CLIENT=', clientID));
    }
    else {
        serverReq = 'GETGAME='.concat(clickedGame, '&CLIENT=', clientID);
        console.log('this is:', serverReq);
        socket.emit('to_server', serverReq);
    }



    gameCaught = true;
}


const Root = ({message, msgList}) =>
    React.createElement('div', {className: 'container'},

        // HEADER START
        React.createElement('div', {className: 'container'},
            React.createElement('nav', {},
                React.createElement('ul', {className: 'nav nav-pills pull-right'},
                    React.createElement('li', {},
                        React.createElement('a', {href: 'client.html'}, 'Play Mode')
                    ),
                    React.createElement('li', {className: 'active'},
                        React.createElement('a', {href: '#'}, 'View Mode')
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
        React.createElement('div', {className: 'row'}, generateBody()),
        // END GENERATE GRID

        // FOOTER START
        React.createElement('footer', {className: 'footer'},
            React.createElement('p', {}, '&copy; 2017 Usama Muneeb')
        )
        // FOOTER END
)

setState({message: '', msgList: []})


function generateBody() {
    // if (gameListGet) {
        if (gameCaught) {
            return generateGrid(gameMatrix);
        }
        else {
            return React.createElement('div', {className: 'list-group'}, getGameList());
        }
    // }
    // else {
    //     return React.createElement('button', {className: 'btn btn-lg btn-default', value: 'Get List', name: 'GETLIST', onClick: (x) => handleClick(x)});
    // }
}

function getGameList () {
    var myList = [];

    for (i=0; i < numGames; ++i) {
        myList.push(
            React.createElement('button', {className: 'list-group-item', name: i, onClick: (x) => handleClick(x) }, 'GAME '.concat(i))
        )
    }
    return myList;
}

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