import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import Loading from "./components/helpers/Loading";
import { a11yProps } from "./components/helpers/TabPanel";
import About from "./components/About";
import Game from "./components/Game";
import Config from "./components/Config";

export default function Play(props: any) {
    const [tabValue, setTabValue] = useState(1);
    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const [boardSetupInput, setBoardSetupInput] = useState("");
    const [boardSetupKey, setBoardSetupKey] = useState("");

    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState(false);

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
                    <About tabValue={tabValue} index={0} />
                    <Game
                        tabValue={tabValue}
                        index={1}
                        currentAccount={props.currentAccount}
                        boardSetupKey={boardSetupKey}
                        setBoardSetupKey={setBoardSetupKey}
                        boardSetupInput={boardSetupInput}
                        setBoardSetupInput={setBoardSetupInput}
                        loading={loading}
                        setLoading={setLoading}
                        loadingMsg={loadingMsg}
                        setLoadingMsg={setLoadingMsg}
                    />
                    <Config
                        tabValue={tabValue}
                        index={2}
                        boardSetupKey={boardSetupKey}
                        setBoardSetupKey={setBoardSetupKey}
                        boardSetupInput={boardSetupInput}
                        setBoardSetupInput={setBoardSetupInput}
                    />
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
                {loading ? <Loading text={loadingMsg} /> : <div />}
            </Box>
        </Box>
    );
}