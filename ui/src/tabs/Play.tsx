import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Modal from "@mui/material/Modal";
import Typography from "@mui/material/Typography";
import * as contract from "../contract";
import * as gameUtils from "../gameUtils";
import Loading from "./components/Loading";
import ReactMarkdown from 'react-markdown';
import Chessboard from '../deps/chessboardjsx/Chessboard';
import Game from "./components/Game";

export default function Play(props: any) {

    const md = `## zkFischer (UI WIP)
How to play:

1. Find a partner. Click **Reset Game**, which will end the currently ongoing game.
1. Click **Register**. Wait for your partner to do the same.
    * First person who registers will be White.
1. Drag pieces onto the back rank for your desired setup. Click **Submit Setup**.
    * You can optionally modify **boardSetupKey** (a salt) if you'd like.
    * On success, your private board setup commitment **boardSetupInput** should populate.
    * These values are saved in local storage and are used to generate client-side proofs when making moves.
1. When both players have set up, click **Read Board** to manually pull the game state from on-chain.
    * Hidden pieces will show up as ghosts.
    * The identities of your pieces (except for king/pawn) are not stored on chain; they are stored in local storage. In some cases this might get corrupted.
1. Make a move. Click "Submit Move".
    * If you mess up the board state, click "Read Board" to resync it.
1. You won't be notified when your opponent makes a move. So click "Read Board" again when it's your turn.
    * You may need to wait a few seconds before reading for the blockchain state to propagate.

Rules reminder:
* No pawn promotion, castling, en passant, 3 fold repetition, game turn limit.
* It's legal to have your king in check. Game ends when a king is captured.

Top TODOs:
* Don't require manual game state sync.
* Split up contract to add more features.
* Add component move validation (disallow illegal drags).
    `;

    const [position, setPosition] = useState({});
    // const [gamePhase, setGamePhase] = useState("Not connected.");

    const [boardSetupInput, setBoardSetupInput] = useState("");
    const [boardSetupKey, setBoardSetupKey] = useState("");

    // const [setupDialogOpen, setSetupDialogOpen] = useState(false);

    const [callOutput, setCallOutput] = useState(false);
    const [callOutputMsg, setCallOutputMsg] = useState("");

    const [error, setError] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [Registering, setRegistering] = useState(false);
    const [SubmittingSetup, setSubmittingSetup] = useState(false);
    const [SubmittingMove, setSubmittingMove] = useState(false);
    const [ResettingGame, setResettingGame] = useState(false);
    const [ReadingBoard, setReadingBoard] = useState(false);

    const getPos = async (currentPosition: any) => {
        setPosition(currentPosition);
    }

    const emptyPosition = {
        a2: 'wP', b2: 'wP', c2: 'wP', d2: 'wP', e2: 'wP', f2: 'wP', g2: 'wP', h2: 'wP',
        a7: 'bP', b7: 'bP', c7: 'bP', d7: 'bP', e7: 'bP', f7: 'bP', g7: 'bP', h7: 'bP'
    };

    const GAME_KEY = `zkFischer.gameKey.${props.currentAccount}`;
    const BOARD_SETUP_KEY = `zkFischer.boardSetupKey.${props.currentAccount}`;
    const BOARD_SETUP_INPUT = `zkFischer.boardSetupInput.${props.currentAccount}`;
    const LAST_GAME_POSITION = `zkFischer.lastPosition.${props.currentAccount}`;

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

    useEffect(() => {
        loadLocalState();
    }, [props.currentAccount]);

    function loadLocalState() {
        setBoardSetupInput(localStorage.getItem(BOARD_SETUP_INPUT) || "");
        setBoardSetupKey(localStorage.getItem(BOARD_SETUP_KEY) || "1000");
        let currentPosition = readLocalStorageKey(LAST_GAME_POSITION, emptyPosition);
        setPosition(currentPosition);
    }

    function resetLocalState() {
        localStorage.removeItem(BOARD_SETUP_INPUT);
        localStorage.removeItem(BOARD_SETUP_KEY);
        localStorage.removeItem(LAST_GAME_POSITION);
    }

    const register = async (event: any) => {
        event.preventDefault();
        setError(false);
        setCallOutput(false);
        setRegistering(true);
        try {
            await contract.register();
            // TODO: will below read always work?
            const playerId = await contract.getPlayerId();
            const color = playerId == 0 ? 'White' : 'Black';
            resetLocalState();
            loadLocalState();
            setCallOutputMsg(`You are playing ${color}. Proceed to setup once both players are registered.`);
            setCallOutput(true);
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
            setCallOutputMsg(`Setup successful. boardSetupInput should populate with: ${response}. Click "Read Board" once your opponent has finished setup.`);
            setCallOutput(true);
            // setSetupDialogOpen(true);
            localStorage.setItem(BOARD_SETUP_INPUT, response);
            localStorage.setItem(BOARD_SETUP_KEY, boardSetupKey);
            setBoardSetupInput(localStorage.getItem(BOARD_SETUP_INPUT) || "");
            setBoardSetupKey(localStorage.getItem(BOARD_SETUP_KEY) || "1000");
            const playerSetupPosition = gameUtils.filterSetupPosition(position, playerId);
            setPosition(playerSetupPosition);
            localStorage.setItem(LAST_GAME_POSITION, JSON.stringify(playerSetupPosition));
        } catch (error) {
            setErrorMsg(error.toString());
            setError(true);
            setSubmittingSetup(false);
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

            setCallOutputMsg(response);
            setCallOutput(true);
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
    const readBoard = async (event: any) => {
        event.preventDefault();
        setError(false);
        setCallOutput(false);
        setReadingBoard(true);
        try {
            const currentPosition = readLocalStorageKey(LAST_GAME_POSITION, emptyPosition);
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
        event.preventDefault();
    }

    const boardSetupKeyHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBoardSetupKey(event.target.value);
    };

    const boardSetupInputHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBoardSetupInput(event.target.value);
    };

    return (
        <Box
            component="form"
            sx={{
                "& .MuiTextField-root": { m: 1, width: "95%" },
                width: "99%", margin: 'auto'
            }}
        >
            <ReactMarkdown children={md}/>
            {/* <Typography>Game phase: {gamePhase}</Typography> */}
            <Chessboard position={position} sparePieces getPosition={getPos} />
            {/* <Game position={position} getPosition={getPos}/> */}
            <br />
            <Button
                onClick={register}
                variant="contained">
                Register
            </Button>
            <TextField
                id="input-boardSetupKey"
                label="boardSetupKey"
                type="text"
                placeholder="Enter a non-negative integer. Save it if you'll change browsers."
                InputLabelProps={{
                    shrink: true,
                }}
                variant="filled"
                onChange={boardSetupKeyHandler}
                value={boardSetupKey}
            />
            {/* <Modal
                open={setupDialogOpen}
                onClose={() => {setSetupDialogOpen(false);}}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box>
                    <Typography id="modal-modal-title" variant="h6" component="h2">
                    Text in a modal
                    </Typography>
                    <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                    Duis mollis, est non commodo luctus, nisi erat porttitor ligula.
                    </Typography>
                </Box>
            </Modal> */}
            <TextField
                id="input-boardSetupInput"
                label="boardSetupInput"
                type="text"
                placeholder="This value will populate after calling submitSetup. Save it if you'll change browsers."
                InputLabelProps={{
                    shrink: true,
                }}
                variant="filled"
                onChange={boardSetupInputHandler}
                value={boardSetupInput}
            />
            <Button
                onClick={submitSetup}
                variant="contained">
                Submit Setup
            </Button>
            <Button
                onClick={submitMove}
                variant="contained">
                Submit Move
            </Button>
            <Button
                onClick={resetGame}
                variant="contained">
                Reset Game
            </Button>
            <Button
                onClick={readBoard}
                variant="contained">
                Read Board
            </Button>
            <br /><br />
            {Registering ? <Loading text="Registering..." /> : <div />}
            {SubmittingSetup ? <Loading text="Submitting setup..." /> : <div />}
            {SubmittingMove ? <Loading text="Submitting move..." /> : <div />}
            {ResettingGame ? <Loading text="Resetting game..." /> : <div />}
            {ReadingBoard ? <Loading text="Reading board..." /> : <div />}
            {error ? <Alert severity="error" sx={{ textAlign: "left" }}>{errorMsg}</Alert> : <div />}
            {callOutput ? <Alert severity="success" sx={{ textAlign: "left" }}>{callOutputMsg}</Alert> : <div />}
        </Box>
    );
}