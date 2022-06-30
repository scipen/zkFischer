import { useState } from 'react';
import BasicTabs from "./TabPanel";
import WalletConnector from "./WalletConnector";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});

export default function App() {
    const [currentAccount, setCurrentAccount] = useState<string | null>(null);
    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <BasicTabs currentAccount={currentAccount} />
            <WalletConnector currentAccount={currentAccount} setCurrentAccount={setCurrentAccount} />
        </ThemeProvider>
    )
}