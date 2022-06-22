import Box from "@mui/material/Box";
import ReactMarkdown from 'react-markdown';
import Chessboard from 'chessboardjsx';

export default function About() {

    const md = `# zkApp: Zero-Knowledge dApp Boilerplate`;

    return (
        <Box
            sx={{
                "& .MuiTextField-root": { m: 1, width: "95%" },
                width: "99%", margin: 'auto'
            }}
        >
            <ReactMarkdown children={md}/>
            <Chessboard position={{ e5: 'wK', e4: 'wP', e7: 'bK' }} />
        </Box>
    );
}