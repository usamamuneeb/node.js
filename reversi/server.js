const fs = require('fs')
      http = require('http')
      socketio = require('socket.io')

const readFile = file => new Promise((resolve, reject) =>
    fs.readFile(file, (err, data) => err ? reject(err) : resolve(data)))

const server = http.createServer(async (request, response) => {
    try {
        response.end(await readFile(request.url.substr(1)))
    } catch (err) {
        response.end()
    }
})

let clients = []

var games = [];
var turns = [];
var numClients = 0;

const io = socketio(server)


const startingMatrix = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 3, 0, 0, 0],
    [0, 0, 0, 3, 2, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
];

var testValidityMatrix = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
];

var validSrcDestPairs = [];

var viewers = [];

io.sockets.on('connection', socket => {
    clients = [...clients, socket]

    ++numClients;
    setTimeout(function () {
        console.log('(!) client connected')
        clients[numClients-1].emit('to_client', 'CLIENTID='.concat(numClients))
        //clients.forEach(s => s.emit('to_client', 'a client connected'))

        if (numClients % 2 == 0) {
            player1 = numClients - 1;
            player2 = numClients;
            // even client connected. grant opponent
            clients[player1-1].emit('to_client', 'OPPONENTID='.concat(player2)) // give myself to the old one
            clients[player2-1].emit('to_client', 'OPPONENTID='.concat(player1)) // give me the old one

            games.push([
                [0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 2, 3, 0, 0, 0],
                [0, 0, 0, 3, 2, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0],
            ]);
            turns.push(player1); // always give older client the first turn

            // tell them who's turn it is
            clients[player1-1].emit('to_client', 'TURN='.concat(player1));
            clients[player2-1].emit('to_client', 'TURN='.concat(player1));

            // provide them the initial board
            clients[player1-1].emit('to_client', startingMatrix);
            clients[player2-1].emit('to_client', startingMatrix);

            // console.log('SHOWING ALL GAMES');
            // console.log(games);
        }
    }, 0)
    
    
    socket.on('disconnect', function () {
        //clients = clients.filter(s => s !== socket);
        console.log('(!) client disconnected')
    })

    socket.on('to_server', function (data){
        console.log(data);

        if (data.search('LIST') !== -1) {
            console.log('list sent');
            viewerInfo = data.split('&');
            viewerID = viewerInfo[1];
            viewerID = viewerID.split('=');
            viewerID = viewerID[1];
            viewerID = parseInt(viewerID);

            clients[viewerID-1].emit('to_client', 'NUMGAMES='.concat(clients.length/2));
        }
        if (data.search('GETGAME=') !== -1) {
            viewerInfo = data.split('&');
            viewerID = viewerInfo[1];
            viewerID = viewerID.split('=');
            viewerID = viewerID[1];
            viewerID = parseInt(viewerID);

            desiredGame = viewerInfo[0];
            desiredGame = desiredGame.split('=');
            desiredGame = desiredGame[1];
            desiredGame = parseInt(desiredGame);

            viewers.push({viewer: viewerID, wants: desiredGame});

            console.log('viewer ', viewerID, ' wants ', desiredGame);
            console.log(viewers);
        }

        if (data.search('GAMEID=') !== -1) {
            gameParams = data.split('&');

            paramGameID = gameParams[0].split('=');
            paramGameID = paramGameID[1];
            paramGameID = parseInt(paramGameID);
            console.log('CHECKING paramGameID');
            console.log(paramGameID);

            paramTurn = gameParams[1].split('=');
            paramTurn = paramTurn[1];
            paramTurn = parseInt(paramTurn);
            turn = paramTurn; // backup

            paramMove = gameParams[2].split('=');
            paramMove = paramMove[1];

            if (paramTurn % 2 == 1) {
                paramTurn = 2;
            }
            else {
                paramTurn = 3;
            }
            row = paramMove[0].charCodeAt(0) - 97;
            col = paramMove[1] - 1;

            gen_testValidityMatrix(games[paramGameID-1]);
            generateValid(turn);

            console.log('testValidityMatrix');
            console.log(testValidityMatrix);
            console.log(validSrcDestPairs);

            // NOTHING WILL HAPPEN IF MOVE WAS NOT VALID (FAKED)
            // USER CAN SIMPLY ENTER ANOTHER SELECTION
            if (testValidityMatrix[row][col]==1) {
                var player1, player2;
                // valid move, shift turn and send updated matrix to each

                prevPlayer = turn;

                if (turn % 2 == 1) {
                    player1 = turn;
                    turn = turn + 1;
                    player2 = turn;
                }
                else {
                    player2 = turn;
                    turn = turn - 1;
                    player1 = turn;
                }

                games[paramGameID-1][row][col] = paramTurn;
                console.log('GAME ', paramGameID, ' SAW A MOVE')
                console.log(games[paramGameID-1]);

                validSrcDestPairs.forEach(function(pair) {
                    if (pair.destC==col && pair.destR==row) {
                        console.log('found pair');
                        xDist = pair.destC - pair.srcC;
                        yDist = pair.destR - pair.srcR;

                        if (xDist !== 0) { xDim = xDist/Math.abs(xDist); }
                        else { xDim = 0; }
                        if (yDist !== 0) { yDim = yDist/Math.abs(yDist); }
                        else { yDim = 0; }

                        for (i=0; i < Math.max(Math.abs(xDist), Math.abs(yDist)); ++i) {
                            modR = pair.srcR + i * yDim;
                            modC = pair.srcC + i * xDim;
                            console.log('now modifying R = ', modR, '; C = ', modC);
                            games[paramGameID-1][modR][modC] = paramTurn;
                        }
                    }
                }, this);

                console.log('processed a turn, now player1: ', player1);
                console.log('processed a turn, now player2: ', player2);

                // check if NEXT PLAYER has any POSSIBLE MOVES

                gen_testValidityMatrix(games[paramGameID-1]);
                generateValid(turn);
                
                console.log('testValidityMatrix');
                console.log(testValidityMatrix);
                console.log(validSrcDestPairs);

                validMovesForNext = countInMat(testValidityMatrix, 1);
                filledSquares = countInMat(testValidityMatrix, 2) + countInMat(testValidityMatrix, 3);
                console.log('filledSquares');
                console.log(filledSquares)

                console.log(validSrcDestPairs.length, 'POSSIBLE MOVES FOR THIS GUY')
                console.log(validMovesForNext, 'POSSIBLE MOVES FOR THIS GUY')

                if (validMovesForNext == 0 || filledSquares == 64) {
                    // GAME END
                    if (validMovesForNext==0) {
                        clients[player1-1].emit('to_client', 'WIN='.concat(prevPlayer, '&REASON=Opponent has no valid move.'));
                        clients[player2-1].emit('to_client', 'WIN='.concat(prevPlayer, '&REASON=Opponent has no valid move.'));
                    }
                    else if (filledSquares==64) {
                        numSquaresPrev = countInMat(testValidityMatrix, playerToBinary(prevPlayer));
                        numSquaresCurr = countInMat(testValidityMatrix, playerToBinary(turn));
                        console.log('prev: ', numSquaresPrev, ', curr: ', numSquaresCurr);

                        if (numSquaresPrev > numSquaresCurr) {
                            clients[player1-1].emit('to_client', 'WIN='.concat(prevPlayer, '&REASON=They captured more boxes.'));
                            clients[player2-1].emit('to_client', 'WIN='.concat(prevPlayer, '&REASON=They captured more boxes.'));
                        }
                        else if (numSquaresCurr > numSquaresPrev) {
                            clients[player1-1].emit('to_client', 'WIN='.concat(turn, '&REASON=They captured more boxes.'));
                            clients[player2-1].emit('to_client', 'WIN='.concat(turn, '&REASON=They captured more boxes.'));
                        }
                        else {
                            clients[player1-1].emit('to_client', 'WIN=DRAW&REASON=0');
                            clients[player2-1].emit('to_client', 'WIN=DRAW&REASON=0');
                        }
                    }


                    clients[player1-1].emit('to_client', games[paramGameID-1]);
                    clients[player2-1].emit('to_client', games[paramGameID-1]);
                }
                else {
                    // GAME CONTINUE
                    clients[player1-1].emit('to_client', 'TURN='.concat(turn));
                    clients[player2-1].emit('to_client', 'TURN='.concat(turn));

                    clients[player1-1].emit('to_client', games[paramGameID-1]);
                    clients[player2-1].emit('to_client', games[paramGameID-1]);
                }
            }   
        }
    })
})

server.listen(8000)



/***********************************************/
/***********************************************/
/***********************************************/
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

    validSrcDestPairs = [];
    
    for (r=0; r<8; ++r) {
        for (c=0; c<8; ++c) {

            if (testValidityMatrix[r][c] == client) {
                //testValidityMatrix[r][c] = 1;
                divergeFromhere(r, c, client, opponent);
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

    } while (row > -1 && row < 8 && col > -1 && col < 8 && testValidityMatrix[row][col]==opponent);

    if (row > -1 && row < 8 && col > -1 && col < 8) {
        if (testValidityMatrix[row][col]==0) {
            if (Math.abs(row - r) > 1 || Math.abs(col - c) > 1) {
                testValidityMatrix[row][col] = 1;
                validSrcDestPairs.push({srcR: r, srcC: c, destR: row, destC: col});
            }
        }
    }
}
/***********************************************/
/***********************************************/
/***********************************************/


function gen_testValidityMatrix (myarr) {
    for (r = 0; r < 8; ++r) {
        for (c = 0; c < 8; ++c) {
            testValidityMatrix[r][c] = myarr[r][c];
        }
    }
}

function countInMat(myMat, toCount) {
    count = 0;

    for (r = 0; r < 8; ++r) {
        for (c = 0; c < 8; ++c) {
            if (myMat[r][c] == toCount) {
                ++count;
            }
        }
    }

    return count;
}

function playerToBinary(player) {
    if (player % 2 == 1) {
        // odd
        return 2;
    }
    else {
        return 3;
    }
}