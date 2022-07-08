import { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from "@mui/material/Typography";
import Chessboard from '../../deps/chessboardjsx/Chessboard';
import TabPanel from "./helpers/TabPanel";

import * as contract from "../game/contract";
import * as gameUtils from "../game/gameUtils";

export default function Game(props: any) {

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

    const [infoMsg, setInfoMsg] = useState(phaseInfo.Register);
    const [callOutput, setCallOutput] = useState(false);
    const [callOutputMsg, setCallOutputMsg] = useState("");
    const [error, setError] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    function showLoading(msg: string) {
        props.setLoading(true);
        props.setLoadingMsg(msg);
    }

    function clearLoading() {
        props.setLoading(false);
        props.setLoadingMsg("");
    }

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
        while (attempts < 20) {
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
            clearLoading();
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
        clearLoading();
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
        clearLoading();
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
        clearLoading();
    }

    useEffect(() => {
        if (props.currentAccount != null) {
            loadLocalState();
            const callAsync = async () => {
                await contract.setup();
                await restoreGame(true);
            }
            callAsync();
        }
    }, [props.currentAccount]);

    useEffect(() => {
        setInfoMsg(gamePhase);
    }, [gamePhase]);

    function loadLocalState() {
        setGameId(readLocalStorageKey(GAME_ID, randInt(1000000000, 1000000000000)));
        props.setBoardSetupInput(localStorage.getItem(BOARD_SETUP_INPUT) || "");
        props.setBoardSetupKey(localStorage.getItem(BOARD_SETUP_KEY) || randInt(1000000000, 1000000000000).toString());
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
        showLoading("Joining game...");
        try {
            resetLocalState();
            localStorage.setItem(GAME_ID, gameId.toString());
            loadLocalState();
            await contract.listen(gameId, props.currentAccount, "Register", onRegister);
            await contract.listen(gameId, props.currentAccount, "SetupBoard", onSetupBoard);
            await contract.listen(gameId, props.currentAccount, "Move", onMove);
            await contract.listen(gameId, props.currentAccount, "GameEnd", onGameEnd);
            await contract.register(gameId);
            showLoading("Waiting for game join confirmation...");
        } catch (error) {
            await contract.clearListen();
            setErrorMsg(`Unable to join. Maybe this Game ID was already taken? error: ${error.toString()}`);
            setError(true);
            clearLoading();
        };
        event.preventDefault();
    }

    const submitSetup = async (event: any) => {
        event.preventDefault();
        setError(false);
        setCallOutput(false);
        showLoading("Submitting setup...");
        try {
            const game = await contract.getGame(gameId);
            const playerId = contract.getPlayerId(game);
            const response = await contract.pubSubmitSetup(gameId, position, props.boardSetupKey, playerId);
            setCallOutput(true);
            props.setBoardSetupInput(response);
            props.setBoardSetupKey(props.boardSetupKey);
            localStorage.setItem(BOARD_SETUP_INPUT, response);
            localStorage.setItem(BOARD_SETUP_KEY, props.boardSetupKey);
            const playerSetupPosition = gameUtils.filterSetupPosition(position, playerId);
            setPosition(playerSetupPosition);
            localStorage.setItem(LAST_GAME_POSITION, JSON.stringify(playerSetupPosition));
            showLoading("Waiting for setup confirmation...");
        } catch (error) {
            setErrorMsg(`Failed to submit setup. error: ${error.toString()}`);
            setError(true);
            clearLoading();
        };
        event.preventDefault();
    }

    const submitMove = async (event: any) => {
        event.preventDefault();
        setError(false);
        setCallOutput(false);
        showLoading("Submitting move...");
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
                    "boardSetupInput": props.boardSetupInput,
                    "boardSetupKey": props.boardSetupKey,
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
            showLoading("Waiting for move confirmation...");
        } catch (error) {
            setErrorMsg(`Failed to submit move. error: ${error.toString()}`);
            setError(true);
            clearLoading();
        }
        event.preventDefault();
    }

    const clearState = async (event: any) => {
        event.preventDefault();
        setError(false);
        setCallOutput(false);
        showLoading("Clearing state...");
        try {
            contract.clearListen();
            resetLocalState();
            loadLocalState();
            setCallOutputMsg("Cleared local state.");
            setCallOutput(true);
        } catch (error) {
            setErrorMsg(error.toString());
            setError(true);
        }
        clearLoading();
        event.preventDefault();
    }

    const restoreGame = async (event?: any, onInit?: boolean) => {
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
        if (onInit) {
            setCallOutputMsg("Restored existing game (if any).");
            setCallOutput(true);
        }
    }

    // TODO: you can call this after your opponent has set up but before you have to reveal their king position
    const readBoard = async (tmpGameId?: number) => {
        setError(false);
        setCallOutput(false);
        showLoading("Reading board...");
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
        }
        clearLoading();
    }

    const gameIdKeyHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setGameId(parseInt(event.target.value));
    };

    return (
        <TabPanel value={props.tabValue} index={1}>
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
    )
}