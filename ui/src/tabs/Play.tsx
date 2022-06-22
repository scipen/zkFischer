import { useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import * as contract from "../contract";
import Loading from "./components/Loading";


export default function Upload() {

    const [submitSetupInput, setSubmitSetupInput] = useState("");
    const [submitMoveInput, setSubmitMoveInput] = useState("");

    const [callOutput, setCallOutput] = useState(false);
    const [callOutputMsg, setCallOutputMsg] = useState("");

    const [error, setError] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [Registering, setRegistering] = useState(false);
    const [SubmittingSetup, setSubmittingSetup] = useState(false);
    const [SubmittingMove, setSubmittingMove] = useState(false);

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
        
        // setRegisterOutput(await contract.register()
        //     .catch((error: any) => {
        //         setErrorMsg(error.toString());
        //         setError(true);
        //         setRegistering(false);
        //     }));
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

        // setSubmitSetupOutput(await contract.submitSetup(submitSetupInput)
        //     .catch((error: any) => {
        //         setErrorMsg(error.toString());
        //         setError(true);
        //         setSubmittingSetup(false);
        //     }));
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

        // setSubmitMoveOutput(await contract.submitMove(submitMoveInput)
        //     .catch((error: any) => {
        //         setErrorMsg(error.toString());
        //         setError(true);
        //         setSubmittingMove(false);
        //     }));
        setSubmittingMove(false);
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
            <Button
                onClick={register}
                variant="contained">
                Register
            </Button>
            <TextField
                id="input-submitSetup"
                label="submitSetup"
                type="text"
                multiline
                defaultValue='{
                    "setupHash": "16362932092467779236188667745398721008062465179344094948620141050502887252044",
                    "gameKey": 0,
                    "boardSetup": [1, 2, 3, 4, 5, 3, 2, 1],
                    "boardSetupKey": 1000
                }'
                minRows={10}
                InputLabelProps={{
                    shrink: true,
                }}
                variant="filled"
                onKeyDown={keyHandler}
                onChange={submitSetupHandler}
                onKeyPress={enterHandler}
            /><br />
            <Button
                onClick={submitSetup}
                variant="contained">
                Submit Setup
            </Button>
            <TextField
                id="input-submitMove"
                label="submitMove"
                type="text"
                multiline
                defaultValue='{
                    "pieceFile": [0, 1, 1],
                    "requiredHash": "16362932092467779236188667745398721008062465179344094948620141050502887252044",
                    "allowedPieces": [3, 4, 0],
                    "gameKey": 0,
                    "boardSetup": [1, 2, 3, 4, 5, 3, 2, 1],
                    "boardSetupKey": 1000
                }'
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
            </Button>
            <br /><br />
            {Registering ? <Loading text="Registering..." /> : <div />}
            {SubmittingSetup ? <Loading text="Submitting setup..." /> : <div />}
            {SubmittingMove ? <Loading text="Submitting move..." /> : <div />}
            {error ? <Alert severity="error" sx={{ textAlign: "left" }}>{errorMsg}</Alert> : <div />}
            {callOutput ? <Alert severity="success" sx={{ textAlign: "left" }}>{callOutputMsg}</Alert> : <div />}
        </Box>
    );
}