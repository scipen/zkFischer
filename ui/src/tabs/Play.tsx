import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import * as contract from "../contract";
import Loading from "./components/Loading";
import ReactMarkdown from 'react-markdown';
import Chessboard from 'chessboardjsx';

export default function Play() {

    const md = `## zkFischer
Last minute UI, will improve soon once I learn some React...  
You can use the debug tab if the chessboard UI is broken.  
1. Find a partner / make sure nobody else is playing (you can check \`contract.phase\` onchain)
1. Click "register".
2. Drag back rank to desired setup. Click "submit setup".
    * UI might be flaky, if you make a mistake try refreshing.
    * On success, you should see your private board setup commitment at the bottom of screen. Save this and put it in boardSetupInput
3. Hidden pieces will show up as queens (pending working dependency patch + custom svg).
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
        console.log(currentPosition);
        setSubmitSetupInput(currentPosition);
        setSubmitMoveInput(currentPosition);
    }

    const emptyPosition = {
        a2: 'wP', b2: 'wP', c2: 'wP', d2: 'wP', e2: 'wP', f2: 'wP', g2: 'wP', h2: 'wP',
        a7: 'bP', b7: 'bP', c7: 'bP', d7: 'bP', e7: 'bP', f7: 'bP', g7: 'bP', h7: 'bP'
    };

    useEffect(() => {
        setSubmitSetupInput(emptyPosition);
        setSubmitMoveInput(emptyPosition);
        setPosition(emptyPosition);
        setBoardSetupKey("1000");
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
        if (event.target.value !== "") {
            setBoardSetupKey(event.target.value);
        }
    };

    const boardSetupInputHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.value !== "") {
            setBoardSetupInput(event.target.value);
        }
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
            <Button
                onClick={register}
                variant="contained">
                Register
            </Button><br /><br />
            <Chessboard position={position} sparePieces getPosition={getPos} />
            <TextField
                id="input-boardSetupKey"
                label="boardSetupKey"
                type="text"
                multiline
                defaultValue={1000}
                minRows={1}
                InputLabelProps={{
                    shrink: true,
                }}
                variant="filled"
                onChange={boardSetupKeyHandler}
            />
            <TextField
                id="input-boardSetupInput"
                label="boardSetupInput"
                type="text"
                multiline
                defaultValue={"copy + save output from calling `Submit Setup`"}
                minRows={1}
                InputLabelProps={{
                    shrink: true,
                }}
                variant="filled"
                onChange={boardSetupInputHandler}
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