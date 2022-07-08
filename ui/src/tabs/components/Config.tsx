import Grid from '@mui/material/Grid';
import TextField from "@mui/material/TextField";
import TabPanel from "./helpers/TabPanel";

export default function Config(props: any) {
    const boardSetupKeyHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        props.setBoardSetupKey(event.target.value);
    };

    const boardSetupInputHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        props.setBoardSetupInput(event.target.value);
    };

    return (
        <TabPanel value={props.tabValue} index={props.index}>
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
                        value={props.boardSetupKey}
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
                        value={props.boardSetupInput}
                        sx={{ "width": "50%" }}
                    />
                </Grid>
            </Grid>
        </TabPanel>
    )
}