import { useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { Typography } from "@mui/material";
import * as contract from "../contract";
import Loading from "./components/Loading";


export default function Upload() {

    const [submitSetupInput, setSubmitSetupInput] = useState("");
    const [submitMoveInput, setSubmitMoveInput] = useState("");

    const [registerOutput, setRegisterOutput] = useState("");
    const [submitSetupOutput, setSubmitSetupOutput] = useState("");
    const [submitMoveOutput, setSubmitMoveOutput] = useState("");
    const [circuitOutput, setCircuitOutput] = useState("");

    const [error, setError] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [Registering, setRegistering] = useState(false);
    const [SubmittingSetup, setSubmittingSetup] = useState(false);
    const [SubmittingMove, setSubmittingMove] = useState(false);

    const register = async (event: any) => {
        event.preventDefault();
        setError(false);

        setRegistering(true);
        setRegisterOutput(await contract.register()
        .catch((error: any) => {
            setErrorMsg(error.toString());
            setError(true);
            setRegistering(false);
        }));
        setRegistering(false);
        event.preventDefault();
    }

    const submitSetup = async (event: any) => {
        event.preventDefault();
        setError(false);

        setSubmittingSetup(true);
        setSubmitSetupOutput(await contract.submitSetup(submitSetupInput)
            .catch((error: any) => {
                setErrorMsg(error.toString());
                setError(true);
                setSubmittingSetup(false);
            }));
        setSubmittingSetup(false);
        event.preventDefault();
    }

    const submitMove = async (event: any) => {
        event.preventDefault();
        setError(false);

        setSubmittingMove(true);
        setSubmitMoveOutput(await contract.submitMove(submitMoveInput)
            .catch((error: any) => {
                setErrorMsg(error.toString());
                setError(true);
                setSubmittingMove(false);
            }));
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
            {/* <Typography>{registerOutput}</Typography> */}
            <Typography>{submitSetupOutput}</Typography>
            <Typography>{submitMoveOutput}</Typography>
            <Typography>{circuitOutput}</Typography>
        </Box>
    );
}