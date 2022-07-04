import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Modal from "@mui/material/Modal";
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
            <Typography>{children}</Typography>
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

1. Find a partner. Click **Reset Game**, which will end the currently ongoing game.
1. Click **Register** and wait for your partner to do the same.
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
* There's currently no pawn promotion, castling, en passant, 3 fold repetition, or game turn limit.
Some of these might be added in the future.

Avoid refreshing the page for the best experience (resuming from local state is possible but might be buggy!).
    `;

    const mdFaq = `
**Q: My piece suddenly disappeared / my local board got corrupted!**  
**A:** Sorry, there's only limited client-side validation right now. Try refreshing the page and clicking "Load Game".  

**Q: Can I play against an AI?**  
**A:** Not currently.

**Q: Can there be multiple ongoing games?**  
**A:** No. The contract state only supports one game instance which anyone can reset by calling "Reset Game".

**Q: Can I resume my game from a different browser?**  
**A:** Not easily. The identities of your hidden pieces (everything except for king/pawn) are not stored on chain; they are stored in browser local storage.
You will also need to export the private circuit inputs you used during game setup. Everything is stored under [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) prefix \`zkFischer\`.

**Q: How does this work?**  
**A:** See the Github README or demo (linked above) for more info.

**Q: Will there be improvements?**  
**A:** Maybe. First focus is on usability and bugfixes. Then on adding pawn promotion. Then on adding fun variants like [atomic](https://en.wikipedia.org/wiki/Atomic_chess).
    `;

    const phaseInfo = {
        Register: `Click "Register" to play with a friend. For help, check the About tab.`,
        Setup: `Set up your back rank. When you're done, click "Submit Setup".`,
        Playing: `Click "Submit Move" once you've made your move.`,
        Register_Done: `Waiting for opponent to register (page will automatically update)...`,
        Setup_Done: `Waiting for opponent to finish setup (page will automatically update)...`,
        Playing_Done: `Waiting for opponent to move (page will automatically update)...`,
        Ended: `Game over. Click "Reset Game" to play again!`
    }

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

    // function updateReactState(localStorageKey: string, setter: any, value: any) {
    //     setter(value);
    //     localStorage.setItem(localStorageKey, value);
    // }

    async function onRegister(acctAddress: string, eventAddress: string) {
        console.log("onRegister: ", eventAddress);
        if (acctAddress.toLowerCase() == eventAddress.toLowerCase()) {
            try {
                const playerId = await contract.getPlayerId();
                const color = playerId == 0 ? 'White' : 'Black';
                setBoardOrientation(color.toLowerCase());
                localStorage.setItem(BOARD_ORIENTATION, color.toLowerCase());
                setCallOutputMsg(`Registration successful. You are playing ${color}.`);
                setCallOutput(true);
                setGamePhase(phaseInfo.Register_Done);
                localStorage.setItem(GAME_PHASE, phaseInfo.Register_Done);
            } catch (error) {
                setErrorMsg(error.toString());
                setError(true);
            };
            setRegisteringConfirm(false);
        }

        try {
            const playerId = await contract.getPlayerId();
            const p0 = await contract.getPlayer(0);
            const p1 = await contract.getPlayer(1);
            if (p0 != 0 && p1 != 0) {
                if (playerId == 0) {
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
            console.error(error.toString());
            // hack: player 2 will get this event before registering so ignore errors
            // all events need to avoid contract calls if user is not playing
            // setErrorMsg(error.toString());
            // setError(true);
        };
    }

    async function onSetupBoard(acctAddress: string, eventAddress: string) {
        console.log("onSetupBoard: ", eventAddress);
        try {
            const playerId = await contract.getPlayerId();
            const hashes = [await contract.getSetupHash(0), await contract.getSetupHash(1)];
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
                if (playerId == 0) {
                    setGamePhase(phaseInfo.Playing);
                    localStorage.setItem(GAME_PHASE, phaseInfo.Playing);
                } else {
                    setGamePhase(phaseInfo.Playing_Done);
                    localStorage.setItem(GAME_PHASE, phaseInfo.Playing_Done);
                }
            }
        } catch (error) {
            setErrorMsg(error.toString());
            setError(true);
        };
        setSubmittingSetupConfirm(false);
    }

    async function onMove(acctAddress: string, eventAddress: string) {
        console.log("onMove: ", eventAddress);
        // don't overwrite game end msg if race condition
        if (gamePhase != phaseInfo.Ended) {
            if (acctAddress.toLowerCase() != eventAddress.toLowerCase()) {
                try {
                    await readBoard();
                    // todo: more race condition
                    if (gamePhase != phaseInfo.Ended) {
                        setCallOutputMsg("Opponent has moved, it's now your turn.");
                        setCallOutput(true);
                        setGamePhase(phaseInfo.Playing);
                        localStorage.setItem(GAME_PHASE, phaseInfo.Playing);
                    }
                } catch (error) {
                    setErrorMsg(error.toString());
                    setError(true);
                };
            } else if (acctAddress.toLowerCase() == eventAddress.toLowerCase()) {
                setCallOutputMsg("Move successful.");
                setCallOutput(true);
                setGamePhase(phaseInfo.Playing_Done);
                localStorage.setItem(GAME_PHASE, phaseInfo.Playing_Done);
            }
        }
        setSubmittingMoveConfirm(false);
    }

    async function onGameEnd(acctAddress: string, eventAddress: string) {
        console.log("onGameEnd: ", eventAddress);
        if (acctAddress.toLowerCase() != eventAddress.toLowerCase()) {
            setCallOutputMsg("You came in 2nd place.");
            setCallOutput(true);
        } else {
            setCallOutputMsg("Congratulations, you win!");
            setCallOutput(true);
        }
        setGamePhase(phaseInfo.Ended);
        localStorage.setItem(GAME_PHASE, phaseInfo.Ended);
    }

    useEffect(() => {
        if (props.currentAccount != null) {
            contract.setup(props.currentAccount, onRegister, onSetupBoard, onMove, onGameEnd);
            loadLocalState();
        }
    }, [props.currentAccount]);

    useEffect(() => {
        setInfoMsg(gamePhase);
    }, [gamePhase]);

    function loadLocalState() {
        setBoardSetupInput(localStorage.getItem(BOARD_SETUP_INPUT) || "");
        setBoardSetupKey(localStorage.getItem(BOARD_SETUP_KEY) || randInt(1000000000, 1000000000000).toString());
        setPosition(readLocalStorageKey(LAST_GAME_POSITION, {}));
        setGamePhase(localStorage.getItem(GAME_PHASE) || phaseInfo.Register);
        setBoardOrientation(localStorage.getItem(BOARD_ORIENTATION) || "white");
        setSparePieces(readLocalStorageKey(SPARE_PIECES, false));
    }

    function resetLocalState() {
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
            loadLocalState();
            await contract.register();
            setRegistering(false);
            setRegisteringConfirm(true);
        } catch (error) {
            setErrorMsg(error.toString());
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
            const playerId = await contract.getPlayerId();
            const response = await contract.pubSubmitSetup(position, boardSetupKey, playerId);
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
            setErrorMsg(error.toString());
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
            const playerId = await contract.getPlayerId();
            const chainPosition = await contract.readBoard();
            const computedMove = gameUtils.computePlayerMove(position, chainPosition);

            // parseMove
            const fromSq = gameUtils.sqToCoords(computedMove["fromSq"]);
            const toSq = gameUtils.sqToCoords(computedMove["toSq"]);
            const pcStartingFile = await contract.getStartingFile(fromSq[0], fromSq[1]);
            const dx = Math.abs(fromSq[0]-toSq[0]);
            const dy = Math.abs(fromSq[1]-toSq[1]);
            let allowedPieces = [0, 0, 0];
            if (dx == 2 && dy == 1 || dx == 1 && dy == 2) {
                allowedPieces = [2, 0, 0]; // knight
            } else if (dx == 0 || dy == 0) {
                allowedPieces = [1, 4, 0]; // rook/queen
            } else if (dx == dy) {
                allowedPieces = [3, 4, 0]; // bishop/queen
            }
            const response = await contract.pubSubmitMove({
                "fromSq": fromSq,
                "toSq": toSq,
                "pcStartingFile": pcStartingFile,
                "allowedPieces": allowedPieces,
                "boardSetupInput": boardSetupInput,
                "boardSetupKey": boardSetupKey,
                "piece": computedMove["piece"],
                "capturedPiece": computedMove["capturedPiece"],
                "playerId": playerId
            });
            
            // update position
            let newPosition: gameUtils.Position = Object.assign({}, position);
            delete newPosition[computedMove["fromSq"]];
            newPosition[computedMove["toSq"]] = computedMove["piece"];
            setPosition(newPosition);
            localStorage.setItem(LAST_GAME_POSITION, JSON.stringify(newPosition));

            setSubmittingMove(false);
            setSubmittingMoveConfirm(true);
        } catch (error) {
            setErrorMsg(error.toString());
            setError(true);
            setSubmittingMove(false);
        }
        setSubmittingMove(false);
        event.preventDefault();
    }

    const resetGame = async (event: any) => {
        event.preventDefault();
        setError(false);
        setCallOutput(false);
        setResettingGame(true);
        try {
            const response = await contract.resetGame();
            resetLocalState();
            loadLocalState();
            setCallOutputMsg(response);
            setCallOutput(true);
        } catch (error) {
            setErrorMsg(error.toString());
            setError(true);
            setResettingGame(false);
        }
        setResettingGame(false);
        event.preventDefault();
    }

    // TODO: you can call this after your opponent has set up but before you have to reveal their king position
    const readBoard = async (event?: any) => {
        if (event) { event.preventDefault(); }
        setError(false);
        setCallOutput(false);
        setReadingBoard(true);
        try {
            const currentPosition = readLocalStorageKey(LAST_GAME_POSITION, {});
            const chainPosition = await contract.readBoard();
            const playerId = await contract.getPlayerId();
            const computedPosition = gameUtils.computePlayerPosition(currentPosition, chainPosition, playerId);
            setPosition(computedPosition);
            localStorage.setItem(LAST_GAME_POSITION, JSON.stringify(computedPosition));
        } catch (error) {
            setErrorMsg(error.toString());
            setError(true);
            setReadingBoard(false);
        }
        setReadingBoard(false);
        if (event) { event.preventDefault(); }
    }

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
                            <Grid item xs={8}>
                                <Chessboard position={position} sparePieces={sparePieces} getPosition={getPos} orientation={boardOrientation} />
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
                                        {gamePhase==phaseInfo.Register ? <Alert severity="info" sx={{ textAlign: "left" }}>
                                            At least one player should click "Reset Game" below <strong>before either player registers.</strong>
                                        </Alert> : <div />}
                                        {error ? <Alert severity="error" sx={{ textAlign: "left", "word-wrap": "break-word" }}>{errorMsg}</Alert> : <div />}
                                    </Grid>
                                    <Grid item alignSelf="center">
                                        {gamePhase == phaseInfo.Register ? 
                                            <Button
                                                onClick={register}
                                                variant="contained">
                                                Register
                                            </Button>
                                        : <div />}
                                        {gamePhase == phaseInfo.Setup ? 
                                            <Button
                                                onClick={submitSetup}
                                                variant="contained">
                                                Submit Setup
                                            </Button>
                                        : <div />}
                                        {gamePhase == phaseInfo.Playing ? 
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
                                                {`Click "Reset Game" to end the current game and reset the contract state. This might interrupt other players!`}
                                            </Alert>
                                        </Grid>
                                        <Grid item alignSelf="center">
                                            <Button
                                                onClick={resetGame}
                                                variant="contained">
                                                Reset Game
                                            </Button>
                                        </Grid>
                                        <Grid item>
                                            <Alert severity="info" icon={false} sx={{ textAlign: "left" }}>
                                                {`Click "Load Game" to attempt to resync your game state with the blockchain. Local board changes will be lost.`}
                                            </Alert>
                                        </Grid>
                                        <Grid item alignSelf="center">
                                            <Button
                                                onClick={readBoard}
                                                variant="contained">
                                                Load Game
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
                {Registering ? <Loading text="Registering..." /> : <div />}
                {RegisteringConfirm ? <Loading text="Waiting for registration confirmation..." /> : <div />}
                {SubmittingSetup ? <Loading text="Submitting setup..." /> : <div />}
                {SubmittingSetupConfirm ? <Loading text="Waiting for setup confirmation..." /> : <div />}
                {SubmittingMove ? <Loading text="Submitting move..." /> : <div />}
                {SubmittingMoveConfirm ? <Loading text="Waiting for move confirmation..." /> : <div />}
                {ResettingGame ? <Loading text="Resetting game..." /> : <div />}
                {ReadingBoard ? <Loading text="Reading board..." /> : <div />}
            </Box>
        </Box>
    );
}