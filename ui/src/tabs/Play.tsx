import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from "@mui/material/Typography";
import * as contract from "../contract";
import * as gameUtils from "../gameUtils";
import Loading from "./components/Loading";
import ReactMarkdown from 'react-markdown';
import Chessboard from '../deps/chessboardjsx/Chessboard';


interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
  
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`vertical-tabpanel-${index}`}
        aria-labelledby={`vertical-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ p: 3 }}>
            <Typography component={'div'}>{children}</Typography>
          </Box>
        )}
      </div>
    );
}

function a11yProps(index: number) {
    return {
      id: `vertical-tab-${index}`,
      'aria-controls': `vertical-tabpanel-${index}`,
    };
}

export default function Play(props: any) {
    const [tabValue, setTabValue] = useState(1);
    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const mdAbout = `
zkFischer is a novel variant of [Fischer Random Chess](https://en.wikipedia.org/wiki/Fischer_random_chess).
Compared to standard chess, where memorizing openings is important, zkFischer emphasizes skill and creativity by
allowing you to **rearrange your starting back rank** while keeping that setup **hidden from your opponent**.

The game runs fully on-chain using zkSNARKs to allow only legal moves. Built as part of [ZKU](https://zku.one/).

**Github:** [https://github.com/scipen/zkFischer](https://github.com/scipen/zkFischer)  
**Demo:** [https://www.youtube.com/watch?v=GyXw3iMLfX0](https://www.youtube.com/watch?v=GyXw3iMLfX0)
    `;

    const mdHow = `
**Quickstart:** On the "Play" tab, just follow the instructions on the right panel. 

1. Find a partner and agree on shared Game ID.
1. Click **Join Game** and wait for your partner to do the same.
1. Drag pieces onto the back rank to specify your desired setup. Click **Submit Setup**.
    * You must place 1 king, 1 queen, 2 rooks, 2 bishops, and 2 knights.
    * Don't know how to play chess? Learn how the pieces move: [https://lichess.org/learn#/](https://lichess.org/learn#/)
    * You can optionally modify \`boardSetupKey\` (a randomly generated salt) on the "Configure" tab if you'd like.
1. When both players have finished setup, the game will start.
    * Click **Submit Move** after making each move.
    * Your back rank pieces (except for king) will all be hidden from your opponent's perspective.
Hidden pieces show up as ghosts but must still move according to their true identity.
    
zkFischer special rules:
* The game ends on king capture. It's legal to have your king in check.
* Pawns automatically promote to queens.
* There's currently no castling, en passant, 3 fold repetition, or game turn limit.
Some of these might be added in the future.

Avoid refreshing the page for the best experience (resuming from local state is possible but might be buggy!).
    `;

    const mdFaq = `
**Q: My piece suddenly disappeared / my local board got corrupted!**  
**A:** Sorry, there's only limited client-side validation right now. Try refreshing the page and clicking "Restore Game".  

**Q: My opponent moved over 30 seconds ago and my screen still hasn't updated.**  
**A:** Check the console for error messages -- there may be a bug. Try refreshing the page and clicking "Restore Game".  

**Q: Can I play against an AI?**  
**A:** Not currently.

**Q: Is there matchmaking?**  
**A:** Not currently.

**Q: Is there a time limit?**  
**A:** Not currently.

**Q: Why does the first person to join a game pay more gas?**  
**A:** That account initializes the game state (contract storage).

**Q: Can I play multiple games simultaneously?**  
**A:** Yes in the backend, but the UI currently doesn't support it.

**Q: Can I resume my game from a different browser?**  
**A:** Not easily. The identities of your hidden pieces (everything except for king/pawn) are not stored on chain; they are stored in browser local storage.
You will also need to export the private circuit inputs you used during game setup. Everything is stored under [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) prefix \`zkFischer\`.

**Q: How does this work?**  
**A:** See the Github README or demo (linked above) for more info.

**Q: Will there be improvements?**  
**A:** Maybe. First focus is on usability and bugfixes. Then on adding pawn promotion. Then on adding fun variants like [atomic](https://en.wikipedia.org/wiki/Atomic_chess).
    `;

    const phaseInfo = {
        Register: `Click "Join Game" to play with a friend with the same Game ID. For help, check the About tab.`,
        Setup: `Set up your back rank. When you're done, click "Submit Setup".`,
        Playing: `Click "Submit Move" once you've made your move.`,
        Register_Done: `Waiting for opponent to join (page will automatically update)...`,
        Setup_Done: `Waiting for opponent to finish setup (page will automatically update)...`,
        Playing_Done: `Waiting for opponent to move (page will automatically update)...`,
        Ended: `Game over. Click "Clear State" to play again!`
    }

    const [gameId, setGameId] = useState(0);
    const [position, setPosition] = useState({});
    const [boardOrientation, setBoardOrientation] = useState("white");
    const [gamePhase, setGamePhase] = useState(phaseInfo.Register);
    const [sparePieces, setSparePieces] = useState(false);

    const [boardSetupInput, setBoardSetupInput] = useState("");
    const [boardSetupKey, setBoardSetupKey] = useState("");

    const [infoMsg, setInfoMsg] = useState(phaseInfo.Register);

    const [callOutput, setCallOutput] = useState(false);
    const [callOutputMsg, setCallOutputMsg] = useState("");

    const [error, setError] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [Registering, setRegistering] = useState(false);
    const [RegisteringConfirm, setRegisteringConfirm] = useState(false);
    const [SubmittingSetup, setSubmittingSetup] = useState(false);
    const [SubmittingSetupConfirm, setSubmittingSetupConfirm] = useState(false);
    const [SubmittingMove, setSubmittingMove] = useState(false);
    const [SubmittingMoveConfirm, setSubmittingMoveConfirm] = useState(false);
    const [ResettingGame, setResettingGame] = useState(false);
    const [ReadingBoard, setReadingBoard] = useState(false);

    // the default 'onDrop' behavior
    const getPos = async (currentPosition: any) => {
        setPosition(currentPosition);
    }

    const setupPositionW = {
        a2: 'wP', b2: 'wP', c2: 'wP', d2: 'wP', e2: 'wP', f2: 'wP', g2: 'wP', h2: 'wP'
    };
    const setupPositionB = {
        a7: 'bP', b7: 'bP', c7: 'bP', d7: 'bP', e7: 'bP', f7: 'bP', g7: 'bP', h7: 'bP'
    };

    const GAME_KEY = `zkFischer.gameKey.${props.currentAccount}`;
    const GAME_ID = `zkFischer.gameId.${props.currentAccount}`;
    const BOARD_SETUP_KEY = `zkFischer.boardSetupKey.${props.currentAccount}`;
    const BOARD_SETUP_INPUT = `zkFischer.boardSetupInput.${props.currentAccount}`;
    const LAST_GAME_POSITION = `zkFischer.lastPosition.${props.currentAccount}`;
    const GAME_PHASE = `zkFischer.gamePhase.${props.currentAccount}`;
    const BOARD_ORIENTATION = `zkFischer.boardOrientation.${props.currentAccount}`;
    const SPARE_PIECES = `zkFischer.sparePieces.${props.currentAccount}`;

    function readLocalStorageKey(key: string, defaultValue: any) {
        let storedValue;
        try {
            storedValue = JSON.parse(localStorage.getItem(key)!);
            if (!storedValue) {
                storedValue = defaultValue;
            }
        } catch {
            storedValue = defaultValue;
        }
        return storedValue;
    }

    function randInt(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    // function updateReactState(localStorageKey: string, setter: any, value: any) {
    //     setter(value);
    //     localStorage.setItem(localStorageKey, value);
    // }

    async function onRegister(acctAddress: string, eventAddress: string) {
        console.log("onRegister: ", eventAddress, gameId);
        
        // todo: sometimes we get stale reads? big hack
        let attempts = 0;
        while (attempts < 10) {
            try {
                const game = await contract.getGame(gameId);
                const playerId = contract.getPlayerId(game);
            } catch (error) {
                attempts += 1;
                await delay(5000);
                continue;
            }
            break;
        }
        const game = await contract.getGame(gameId);

        if (acctAddress.toLowerCase() === eventAddress.toLowerCase()) {
            try {
                const playerId = contract.getPlayerId(game);
                const color = playerId === 0 ? 'White' : 'Black';
                setBoardOrientation(color.toLowerCase());
                localStorage.setItem(BOARD_ORIENTATION, color.toLowerCase());
                setCallOutputMsg(`Successfully joined game ${gameId}. You are playing ${color}.`);
                setCallOutput(true);
                setGamePhase(phaseInfo.Register_Done);
                localStorage.setItem(GAME_PHASE, phaseInfo.Register_Done);
            } catch (error) {
                console.log(error);
                // setErrorMsg(error.toString());
                // setError(true);
            };
            setRegisteringConfirm(false);
        }

        try {
            const playerId = contract.getPlayerId(game);
            const p0 = contract.getPlayer(game, 0);
            const p1 = contract.getPlayer(game, 1);
            if (p0 != 0 && p1 != 0) {
                if (playerId === 0) {
                    setPosition(setupPositionW);
                    localStorage.setItem(LAST_GAME_POSITION, JSON.stringify(setupPositionW));
                } else {
                    setPosition(setupPositionB);
                    localStorage.setItem(LAST_GAME_POSITION, JSON.stringify(setupPositionB));
                }
                setSparePieces(true);
                localStorage.setItem(SPARE_PIECES, "true");
                setGamePhase(phaseInfo.Setup);
                localStorage.setItem(GAME_PHASE, phaseInfo.Setup);
            }
        } catch (error) {
            // todo: race condition when getting p0's event before register complete
            console.error(error);
            // setErrorMsg(error.toString());
            // setError(true);
        };
    }

    async function onSetupBoard(acctAddress: string, eventAddress: string) {
        console.log("onSetupBoard: ", eventAddress, gameId);
        const game = await contract.getGame(gameId);

        const playerId = contract.getPlayerId(game);
        const hashes = [contract.getSetupHash(game, 0), contract.getSetupHash(game, 1)];
        if (hashes[playerId] != 0) {
            setCallOutputMsg("Setup successful.");
            setCallOutput(true);
            setGamePhase(phaseInfo.Setup_Done);
            localStorage.setItem(GAME_PHASE, phaseInfo.Setup_Done);
        }
        if (hashes[0] != 0 && hashes[1] != 0) {
            await readBoard();
            setCallOutputMsg("Both players have finished setup. It's now White's turn.");
            setCallOutput(true);
            setSparePieces(false);
            localStorage.setItem(SPARE_PIECES, "false");
            if (playerId === 0) {
                setGamePhase(phaseInfo.Playing);
                localStorage.setItem(GAME_PHASE, phaseInfo.Playing);
            } else {
                setGamePhase(phaseInfo.Playing_Done);
                localStorage.setItem(GAME_PHASE, phaseInfo.Playing_Done);
            }
        }
        setSubmittingSetupConfirm(false);
    }

    async function onMove(acctAddress: string, eventAddress: string) {
        console.log("onMove: ", eventAddress, gameId);

        // shouldn't ever happen now but unvalidated spaghetti
        if (gamePhase != phaseInfo.Ended) {
            if (acctAddress.toLowerCase() != eventAddress.toLowerCase()) {
                await readBoard();
                // todo: more race condition
                if (gamePhase != phaseInfo.Ended) {
                    setCallOutputMsg("Opponent has moved, it's now your turn.");
                    setCallOutput(true);
                    setGamePhase(phaseInfo.Playing);
                    localStorage.setItem(GAME_PHASE, phaseInfo.Playing);
                }
            } else if (acctAddress.toLowerCase() === eventAddress.toLowerCase()) {
                setCallOutputMsg("Move successful.");
                setCallOutput(true);
                setGamePhase(phaseInfo.Playing_Done);
                localStorage.setItem(GAME_PHASE, phaseInfo.Playing_Done);
            }
        }
        setSubmittingMoveConfirm(false);
    }

    async function onGameEnd(acctAddress: string, eventAddress: string) {
        console.log("onGameEnd: ", eventAddress, gameId);
        if (acctAddress.toLowerCase() != eventAddress.toLowerCase()) {
            setCallOutputMsg("You came in 2nd place.");
            setCallOutput(true);
        } else {
            setCallOutputMsg("Congratulations, you win!");
            setCallOutput(true);
        }
        setGamePhase(phaseInfo.Ended);
        localStorage.setItem(GAME_PHASE, phaseInfo.Ended);
        setSubmittingMoveConfirm(false);
    }

    useEffect(() => {
        if (props.currentAccount != null) {
            loadLocalState();
            const callAsync = async () => {
                await contract.setup();
                await restoreGame();
            }
            callAsync();
        }
    }, [props.currentAccount]);

    useEffect(() => {
        setInfoMsg(gamePhase);
    }, [gamePhase]);

    function loadLocalState() {
        setGameId(readLocalStorageKey(GAME_ID, randInt(1000000000, 1000000000000)));
        setBoardSetupInput(localStorage.getItem(BOARD_SETUP_INPUT) || "");
        setBoardSetupKey(localStorage.getItem(BOARD_SETUP_KEY) || randInt(1000000000, 1000000000000).toString());
        setPosition(readLocalStorageKey(LAST_GAME_POSITION, {}));
        setGamePhase(localStorage.getItem(GAME_PHASE) || phaseInfo.Register);
        setBoardOrientation(localStorage.getItem(BOARD_ORIENTATION) || "white");
        setSparePieces(readLocalStorageKey(SPARE_PIECES, false));
    }

    function resetLocalState() {
        localStorage.removeItem(GAME_ID);
        localStorage.removeItem(BOARD_SETUP_INPUT);
        localStorage.removeItem(BOARD_SETUP_KEY);
        localStorage.removeItem(LAST_GAME_POSITION);
        localStorage.removeItem(GAME_PHASE);
        localStorage.removeItem(BOARD_ORIENTATION);
        localStorage.removeItem(SPARE_PIECES);
    }

    const register = async (event: any) => {
        event.preventDefault();
        setError(false);
        setCallOutput(false);
        setRegistering(true);
        try {
            resetLocalState();
            localStorage.setItem(GAME_ID, gameId.toString());
            loadLocalState();
            await contract.listen(gameId, props.currentAccount, "Register", onRegister);
            await contract.listen(gameId, props.currentAccount, "SetupBoard", onSetupBoard);
            await contract.listen(gameId, props.currentAccount, "Move", onMove);
            await contract.listen(gameId, props.currentAccount, "GameEnd", onGameEnd);
            await contract.register(gameId);
            setRegistering(false);
            setRegisteringConfirm(true);
        } catch (error) {
            await contract.clearListen();
            setErrorMsg(`Unable to join. Maybe this Game ID was already taken? error: ${error.toString()}`);
            setError(true);
        };
        setRegistering(false);
        event.preventDefault();
    }

    const submitSetup = async (event: any) => {
        event.preventDefault();
        setError(false);
        setCallOutput(false);
        setSubmittingSetup(true);
        try {
            const game = await contract.getGame(gameId);
            const playerId = contract.getPlayerId(game);
            const response = await contract.pubSubmitSetup(gameId, position, boardSetupKey, playerId);
            setCallOutput(true);
            setBoardSetupInput(response);
            setBoardSetupKey(boardSetupKey);
            localStorage.setItem(BOARD_SETUP_INPUT, response);
            localStorage.setItem(BOARD_SETUP_KEY, boardSetupKey);
            const playerSetupPosition = gameUtils.filterSetupPosition(position, playerId);
            setPosition(playerSetupPosition);
            localStorage.setItem(LAST_GAME_POSITION, JSON.stringify(playerSetupPosition));
            setSubmittingSetup(false);
            setSubmittingSetupConfirm(true);
        } catch (error) {
            setErrorMsg(`Failed to submit setup. error: ${error.toString()}`);
            setError(true);
        };
        setSubmittingSetup(false);
        event.preventDefault();
    }

    const submitMove = async (event: any) => {
        event.preventDefault();
        setError(false);
        setCallOutput(false);
        setSubmittingMove(true);
        try {
            const game = await contract.getGame(gameId);
            const playerId = contract.getPlayerId(game);
            const requiredHash = contract.getSetupHash(game, playerId).toString();

            const chainPosition = await contract.getBoard(gameId);
            const computedMove = gameUtils.computePlayerMove(position, chainPosition);

            // parseMove
            const fromSq = gameUtils.sqToCoords(computedMove["fromSq"]);
            const toSq = gameUtils.sqToCoords(computedMove["toSq"]);
            const pcStartingFile = await contract.getStartingFile(gameId, fromSq[0], fromSq[1]);
            const dx = Math.abs(fromSq[0]-toSq[0]);
            const dy = Math.abs(fromSq[1]-toSq[1]);
            let allowedPieces = [0, 0, 0];
            if (dx === 2 && dy === 1 || dx === 1 && dy === 2) {
                allowedPieces = [2, 0, 0]; // knight
            } else if (dx === 0 || dy === 0) {
                allowedPieces = [1, 4, 0]; // rook/queen
            } else if (dx === dy) {
                allowedPieces = [3, 4, 0]; // bishop/queen
            }
            const response = await contract.pubSubmitMove(
                {
                    "gameId": gameId,
                    "fromSq": fromSq,
                    "toSq": toSq,
                    "pcStartingFile": pcStartingFile,
                    "allowedPieces": allowedPieces,
                    "boardSetupInput": boardSetupInput,
                    "boardSetupKey": boardSetupKey,
                    "piece": computedMove["piece"],
                    "capturedPiece": computedMove["capturedPiece"],
                    "requiredHash": requiredHash
                }
            );
            
            // update position
            let newPosition: gameUtils.Position = Object.assign({}, position);
            delete newPosition[computedMove["fromSq"]];

            // another hack to track pawn promo client-side
            const pcColor = computedMove["piece"][0];
            const pcValue = computedMove["piece"][1];
            if (pcValue === 'P' && computedMove["toSq"][1] === '8' && pcColor === 'w') {
                computedMove["piece"] = 'wQ';
            } else if (pcValue === 'P' && computedMove["toSq"][1] === '1' && pcColor === 'b') {
                computedMove["piece"] = 'bQ';
            }
            
            newPosition[computedMove["toSq"]] = computedMove["piece"];
            setPosition(newPosition);
            localStorage.setItem(LAST_GAME_POSITION, JSON.stringify(newPosition));

            setSubmittingMove(false);
            setSubmittingMoveConfirm(true);
        } catch (error) {
            setErrorMsg(`Failed to submit move. error: ${error.toString()}`);
            setError(true);
            setSubmittingMove(false);
        }
        setSubmittingMove(false);
        event.preventDefault();
    }

    const clearState = async (event: any) => {
        event.preventDefault();
        setError(false);
        setCallOutput(false);
        setResettingGame(true);
        try {
            contract.clearListen();
            resetLocalState();
            loadLocalState();
            setCallOutputMsg("Cleared local state.");
            setCallOutput(true);
        } catch (error) {
            setErrorMsg(error.toString());
            setError(true);
            setResettingGame(false);
        }
        setResettingGame(false);
        event.preventDefault();
    }

    const restoreGame = async () => {
        // todo: verify it's your game...
        // todo: how to do this properly?
        const tmpGameId = readLocalStorageKey(GAME_ID, 0);
        if (tmpGameId !== 0) {
            await contract.listen(tmpGameId, props.currentAccount, "Register", onRegister);
            await contract.listen(tmpGameId, props.currentAccount, "SetupBoard", onSetupBoard);
            await contract.listen(tmpGameId, props.currentAccount, "Move", onMove);
            await contract.listen(tmpGameId, props.currentAccount, "GameEnd", onGameEnd);
            await readBoard(tmpGameId);
        }
        setCallOutputMsg("Restored existing game (if any).");
        setCallOutput(true);
    }

    // TODO: you can call this after your opponent has set up but before you have to reveal their king position
    const readBoard = async (tmpGameId?: number) => {
        setError(false);
        setCallOutput(false);
        setReadingBoard(true);
        const fnGameId = tmpGameId || gameId;
        try {
            const currentPosition = readLocalStorageKey(LAST_GAME_POSITION, {});
            const chainPosition = await contract.getBoard(fnGameId);
            const game = await contract.getGame(fnGameId);
            const playerId = contract.getPlayerId(game);
            // const contractPhase = contract.getPhase(game);
            const computedPosition = gameUtils.computePlayerPosition(currentPosition, chainPosition, playerId);
            setPosition(computedPosition);
            localStorage.setItem(LAST_GAME_POSITION, JSON.stringify(computedPosition));
        } catch (error) {
            // todo: suppressing error bc of sometimes invalid getPlayerId call
            console.error(error);
            // setErrorMsg(error.toString());
            // setError(true);
            setReadingBoard(false);
        }
        setReadingBoard(false);
    }

    const gameIdKeyHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setGameId(parseInt(event.target.value));
    };

    const boardSetupKeyHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBoardSetupKey(event.target.value);
    };

    const boardSetupInputHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBoardSetupInput(event.target.value);
    };

    return (
        <Box>
            <Grid container spacing={1}>
                <Grid item xs={2}>
                    <Tabs
                        orientation="vertical"
                        variant="scrollable"
                        value={tabValue}
                        onChange={handleChange}
                        aria-label="Vertical tabs example"
                        sx={{ borderRight: 1, borderColor: 'divider' }}
                    >
                        <Tab label="About" {...a11yProps(0)} />
                        <Tab label="Play" {...a11yProps(1)} />
                        <Tab label="Configure" {...a11yProps(2)} />
                    </Tabs>
                </Grid>
                <Grid item xs={10}>
                    <TabPanel value={tabValue} index={0}>
                        <Grid container spacing={1} direction="column">
                            <Grid item>
                                <Paper>
                                    <Typography align="center">About</Typography>
                                </Paper>
                            </Grid>
                            <Grid item>
                                <ReactMarkdown children={mdAbout}/>
                            </Grid>
                            <Grid item>
                                <Paper>
                                    <Typography align="center">How to Play</Typography>
                                </Paper>
                            </Grid>
                            <Grid item>
                                <ReactMarkdown children={mdHow}/>
                            </Grid>
                            <Grid item>
                                <Paper>
                                    <Typography align="center">FAQ & Troubleshooting</Typography>
                                </Paper>
                            </Grid>
                            <Grid item>
                                <ReactMarkdown children={mdFaq}/>
                            </Grid>
                        </Grid> 
                    </TabPanel>
                    <TabPanel value={tabValue} index={1}>
                        <Grid container spacing={0}>
                            <Grid item xs={8} spacing={1} container direction="column">
                                <Grid item>
                                    <Typography align="center">
                                        Game ID: {
                                            gamePhase === phaseInfo.Register ? "disconnected" : gameId
                                        }
                                    </Typography>
                                </Grid>
                                <Grid item>
                                    <Chessboard position={position} sparePieces={sparePieces} getPosition={getPos} orientation={boardOrientation} />
                                </Grid>
                            </Grid>
                            <Grid item xs={4} spacing={4} container direction="column">
                                <Grid item container spacing={1} direction="column" wrap="nowrap">
                                    <Grid item>
                                        <Paper>    
                                            <Typography align="center">Game status</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item>
                                        {callOutput ? <Alert severity="success" sx={{ textAlign: "left" }}>{callOutputMsg}</Alert> : <div />}
                                        <Alert severity="info" sx={{ textAlign: "left" }}>{infoMsg}</Alert>
                                        {gamePhase === phaseInfo.Register ? 
                                            <TextField
                                            id="input-gameId"
                                            label="Game ID"
                                            type="text"
                                            placeholder="Enter a non-negative integer."
                                            InputLabelProps={{
                                                shrink: true,
                                            }}
                                            variant="filled"
                                            onChange={gameIdKeyHandler}
                                            value={gameId}
                                            sx={{ "width": "100%" }}
                                            />
                                        // <Alert severity="info" sx={{ textAlign: "left" }}>At least one player should click "Reset Game" below <strong>before either player registers.</strong></Alert> 
                                        : <div />}
                                        {error ? <Alert severity="error" sx={{ textAlign: "left", "word-wrap": "break-word" }}>{errorMsg}</Alert> : <div />}
                                    </Grid>
                                    <Grid item alignSelf="center">
                                        {gamePhase === phaseInfo.Register ? 
                                            <Button
                                                onClick={register}
                                                variant="contained">
                                                Join Game
                                            </Button>
                                        : <div />}
                                        {gamePhase === phaseInfo.Setup ? 
                                            <Button
                                                onClick={submitSetup}
                                                variant="contained">
                                                Submit Setup
                                            </Button>
                                        : <div />}
                                        {gamePhase === phaseInfo.Playing ? 
                                            <Button
                                                onClick={submitMove}
                                                variant="contained">
                                                Submit Move
                                            </Button>
                                        : <div />}
                                    </Grid>
                                </Grid>
                                <Grid item container spacing={1} direction="column" wrap="nowrap">
                                    <Grid item>
                                        <Paper>    
                                            <Typography align="center">Other controls</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item container spacing={2} direction="column" wrap="nowrap">
                                        <Grid item>
                                            <Alert severity="info" icon={false} sx={{ textAlign: "left" }}>
                                                {`Click "Restore Game" to attempt to resync your game state with the blockchain. Local board changes will be lost.`}
                                            </Alert>
                                        </Grid>
                                        <Grid item alignSelf="center">
                                            <Button
                                                onClick={restoreGame}
                                                variant="contained">
                                                Restore Game
                                            </Button>
                                        </Grid>
                                        <Grid item>
                                            <Alert severity="warning" icon={false} sx={{ textAlign: "left" }}>
                                                {`"Clear State" will delete all local game data and allow you to join a new game. `}{<strong>You currently won't be able to resume an ongoing game!</strong>}
                                            </Alert>
                                        </Grid>
                                        <Grid item alignSelf="center">
                                            <Button
                                                onClick={clearState}
                                                variant="contained">
                                                Clear State
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </TabPanel>
                    <TabPanel value={tabValue} index={2}>
                        <Grid container spacing={1} direction="column">
                            <Grid item>
                                These parameters are used for generating zkSNARK proofs during the game.
                            </Grid>
                            <Grid item>
                                <TextField
                                    id="input-boardSetupKey"
                                    label="boardSetupKey"
                                    type="text"
                                    placeholder="Enter a non-negative integer."
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                    variant="filled"
                                    onChange={boardSetupKeyHandler}
                                    value={boardSetupKey}
                                    sx={{ "width": "50%" }}
                                />
                            </Grid>
                            <Grid item>
                                <TextField
                                    id="input-boardSetupInput"
                                    label="boardSetupInput"
                                    type="text"
                                    disabled
                                    placeholder="This value will populate after calling submitSetup."
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                    variant="filled"
                                    onChange={boardSetupInputHandler}
                                    value={boardSetupInput}
                                    sx={{ "width": "50%" }}
                                />
                            </Grid>
                        </Grid>
                    </TabPanel>
                </Grid>
            </Grid>
            <Box
                component="form"
                sx={{
                    "& .MuiTextField-root": { m: 1, width: "95%" },
                    width: "99%", margin: 'auto'
                }}
            >   
                <br /><br />
                {Registering ? <Loading text="Joining game..." /> : <div />}
                {RegisteringConfirm ? <Loading text="Waiting for game join confirmation..." /> : <div />}
                {SubmittingSetup ? <Loading text="Submitting setup..." /> : <div />}
                {SubmittingSetupConfirm ? <Loading text="Waiting for setup confirmation..." /> : <div />}
                {SubmittingMove ? <Loading text="Submitting move..." /> : <div />}
                {SubmittingMoveConfirm ? <Loading text="Waiting for move confirmation..." /> : <div />}
                {ResettingGame ? <Loading text="Clearing state..." /> : <div />}
                {ReadingBoard ? <Loading text="Reading board..." /> : <div />}
            </Box>
        </Box>
    );
}