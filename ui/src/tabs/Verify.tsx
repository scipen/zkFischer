import { useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { verifyProof } from "../contract";
import Loading from "./components/Loading";
import { Typography } from "@mui/material";

export default function Upload() {

    const [circuitInput, setCircuitInput] = useState("");
    const [circuitInputDisable, setCircuitInputDisable] = useState(true);

    const [circuitOutput, setCircuitOutput] = useState("");

    const [error, setError] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [Verifying, setVerifying] = useState(false);

    const verify = async (event: any) => {
        event.preventDefault();
        setError(false);

        setVerifying(true);
        setCircuitOutput(await verifyProof(circuitInput)
            .catch((error: any) => {
                setErrorMsg(error.toString());
                setError(true);
                setVerifying(false);
            }));
        setVerifying(false);
        event.preventDefault();
    }

    const circuitInputHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.value !== "") {
            setCircuitInput(event.target.value);
            setCircuitInputDisable(false);
        }
        else {
            setCircuitInputDisable(true);
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
            <TextField
                id="input-circuitInput"
                label="circuitInput"
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
                onChange={circuitInputHandler}
                onKeyPress={enterHandler}
            /><br />
            <Button
                onClick={verify}
                disabled={(circuitInputDisable)}
                variant="contained">
                Verify
            </Button>
            <br /><br />
            {Verifying ? <Loading text="Verifying proof..." /> : <div />}
            {error ? <Alert severity="error" sx={{ textAlign: "left" }}>{errorMsg}</Alert> : <div />}
            <Typography>{circuitOutput}</Typography>
        </Box>
    );
}