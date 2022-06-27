import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import * as contract from "../contract";
import Loading from "./components/Loading";


export default function Debug() {

    const [submitSetupInput, setSubmitSetupInput] = useState("");
    const [submitMoveInput, setSubmitMoveInput] = useState("");

    const [callOutput, setCallOutput] = useState(false);
    const [callOutputMsg, setCallOutputMsg] = useState("");

    const [error, setError] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [Registering, setRegistering] = useState(false);
    const [SubmittingSetup, setSubmittingSetup] = useState(false);
    const [SubmittingMove, setSubmittingMove] = useState(false);
    const [ResettingGame, setResettingGame] = useState(false);

    const setupDefaultInput = JSON.stringify({
        "setupHash": "16362932092467779236188667745398721008062465179344094948620141050502887252044",
        "kingFile": 4,
        "gameKey": 0,
        "boardSetup": [1, 2, 3, 4, 5, 3, 2, 1],
        "boardSetupKey": 1000
    });

    const moveDefaultInput = JSON.stringify({
        "fromSq": [7,1],
        "toSq": [5,0],
        "pieceFile": [0, 0, 1],
        "requiredHash": "16362932092467779236188667745398721008062465179344094948620141050502887252044",
        "allowedPieces": [2, 0, 0],
        "gameKey": 0,
        "boardSetup": [1, 2, 3, 4, 5, 3, 2, 1],
        "boardSetupKey": 1000
    });

    useEffect(() => {
        setSubmitSetupInput(setupDefaultInput);
        setSubmitMoveInput(moveDefaultInput);
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
        await contract.submitSetup(submitSetupInput).then(
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
        await contract.submitMove(submitMoveInput).then(
            (value: any) => {
                setCallOutputMsg(value);
                setCallOutput(true);
            },
            (error: any) => {
                setErrorMsg(error.toString());
                setError(true);
                setSubmittingMove(false);
            });

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

    const submitSetupHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.value !== "") {
            setSubmitSetupInput(event.target.value);
        }
    };

    const submitMoveHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.value !== "") {
            setSubmitMoveInput(event.target.value);
        }
    };

    const enterHandler = async (event: any) => {
        if (event.which === "13") {
            event.preventDefault();
        }
    };


    const keyHandler = async (event: any) => {
        if (['e', 'E', '+', '.', 'Enter'].includes(event.key)) {
            event.preventDefault();
        }
    };

    return (
        <Box
            component="form"
            sx={{
                "& .MuiTextField-root": { m: 1, width: "95%" },
                width: "99%", margin: 'auto'
            }}
            noValidate
            autoComplete="off"
            textAlign="center"
        >
            <Typography>You can call game backend functions here.</Typography>
            <Typography>Outputs render at the bottom of the page.</Typography><br />
            <Button
                onClick={register}
                variant="contained">
                Register
            </Button><br /><br />
            <TextField
                id="input-submitSetup"
                label="submitSetup"
                type="text"
                multiline
                defaultValue={setupDefaultInput}
                minRows={10}
                InputLabelProps={{
                    shrink: true,
                }}
                variant="filled"
                onKeyDown={keyHandler}
                onChange={submitSetupHandler}
                onKeyPress={enterHandler}
            />
            <Button
                onClick={submitSetup}
                variant="contained">
                Submit Setup
            </Button><br /><br />
            <TextField
                id="input-submitMove"
                label="submitMove"
                type="text"
                multiline
                defaultValue={moveDefaultInput}
                minRows={10}
                InputLabelProps={{
                    shrink: true,
                }}
                variant="filled"
                onKeyDown={keyHandler}
                onChange={submitMoveHandler}
                onKeyPress={enterHandler}
            /><br />
            <Button
                onClick={submitMove}
                variant="contained">
                Submit Move
            </Button><br /><br />
            <Button
                onClick={resetGame}
                variant="contained">
                Reset Game
            </Button>
            <br /><br />
            {Registering ? <Loading text="Registering..." /> : <div />}
            {SubmittingSetup ? <Loading text="Submitting setup..." /> : <div />}
            {SubmittingMove ? <Loading text="Submitting move..." /> : <div />}
            {ResettingGame ? <Loading text="Resetting game..." /> : <div />}
            {error ? <Alert severity="error" sx={{ textAlign: "left" }}>{errorMsg}</Alert> : <div />}
            {callOutput ? <Alert severity="success" sx={{ textAlign: "left" }}>{callOutputMsg}</Alert> : <div />}
        </Box>
    );
}