import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Modal from "@mui/material/Modal";
import Typography from "@mui/material/Typography";
import * as contract from "../contract";
import Loading from "./components/Loading";
import ReactMarkdown from 'react-markdown';
import Chessboard from '../deps/chessboardjsx/Chessboard';
import Game from "./components/Game";

export default function Play(props: any) {

    const md = `## zkFischer
Last minute UI, will improve soon once I learn some React...  
You can use the debug tab if the chessboard UI is broken.  
1. Find a partner / make sure nobody else is playing (you can check \`contract.phase\` onchain)
1. Click "register".
2. Drag back rank to desired setup. Click "submit setup".
    * UI might be flaky, if you make a mistake try refreshing.
    * On success, you should see your private board setup commitment at the bottom of screen. Save this and put it in boardSetupInput
3. ~~Hidden pieces will show up as queens (pending working dependency patch + custom svg).~~ update: they now show up as blobs
3. When both players have set up, click "Read Board" to manually pull the game state from on-chain.
4. Make a move. Click "submit move".
5. You won't be notified when your opponent makes a move. So click "Read Board" again when it's your turn.
5. When game is done, click "reset game" for the next person.

Obviously a bad UX for now!
    `;

    const [position, setPosition] = useState({});

    const [boardSetupInput, setBoardSetupInput] = useState("");
    const [boardSetupKey, setBoardSetupKey] = useState("");

    const [submitSetupInput, setSubmitSetupInput] = useState({});
    const [submitMoveInput, setSubmitMoveInput] = useState({});

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
        setSubmitSetupInput(currentPosition);
        setSubmitMoveInput(currentPosition);
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
        let currentPosition = readLocalStorageKey(LAST_GAME_POSITION, emptyPosition);
        setSubmitSetupInput(currentPosition);
        setSubmitMoveInput(currentPosition);
        setPosition(currentPosition);

        setBoardSetupInput(localStorage.getItem(BOARD_SETUP_INPUT) || "");
        setBoardSetupKey(localStorage.getItem(BOARD_SETUP_KEY) || "1000")
    }, []);

    const register = async (event: any) => {
        event.preventDefault();
        setError(false);
        setCallOutput(false);

        setRegistering(true);
        await contract.register().then(
            (value: any) => {
                setCallOutputMsg(value);
                setCallOutput(true);
            },
            (error: any) => {
                setErrorMsg(error.toString());
                setError(true);
                setRegistering(false);
            });
        
        setRegistering(false);
        event.preventDefault();
    }

    const submitSetup = async (event: any) => {
        event.preventDefault();
        setError(false);
        setCallOutput(false);

        setSubmittingSetup(true);
        await contract.pubSubmitSetup(submitSetupInput, boardSetupKey).then(
            (value: any) => {
                setCallOutputMsg(value);
                setCallOutput(true);
                localStorage.setItem(BOARD_SETUP_KEY, JSON.stringify(boardSetupKey));
                localStorage.setItem(BOARD_SETUP_INPUT, JSON.stringify(submitSetupInput));
            },
            (error: any) => {
                setErrorMsg(error.toString());
                setError(true);
                setSubmittingSetup(false);
            });

        setSubmittingSetup(false);
        event.preventDefault();
    }

    const submitMove = async (event: any) => {
        event.preventDefault();
        setError(false);
        setCallOutput(false);

        setSubmittingMove(true);
        let move;
        await contract.diffBoard(submitMoveInput).then(
            (value: any) => {
                // setCallOutputMsg(value);
                // setCallOutput(true);
                move = value;
            },
            (error: any) => {
                setErrorMsg(error.toString());
                setError(true);
                setSubmittingMove(false);
            });
        if (move != null) {
            await contract.pubSubmitMove(boardSetupInput, boardSetupKey, move).then(
                (value: any) => {
                    setCallOutputMsg(value);
                    setCallOutput(true);
                },
                (error: any) => {
                    setErrorMsg(error.toString());
                    setError(true);
                    setSubmittingMove(false);
                });
        }

        setSubmittingMove(false);
        event.preventDefault();
    }

    const resetGame = async (event: any) => {
        event.preventDefault();
        setError(false);
        setCallOutput(false);

        setResettingGame(true);
        await contract.resetGame().then(
            (value: any) => {
                setCallOutputMsg(value);
                setCallOutput(true);
            },
            (error: any) => {
                setErrorMsg(error.toString());
                setError(true);
                setResettingGame(false);
            });

        setResettingGame(false);
        event.preventDefault();
    }

    const readBoard = async (event: any) => {
        event.preventDefault();
        setError(false);
        setCallOutput(false);

        setReadingBoard(true);
        await contract.readBoard().then(
            (value: any) => {
                setPosition(value);
                localStorage.setItem(LAST_GAME_POSITION, JSON.stringify(value));
            },
            (error: any) => {
                setErrorMsg(error.toString());
                setError(true);
                setReadingBoard(false);
            });

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