import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ReactMarkdown from 'react-markdown';
import Chessboard from 'chessboardjsx';


export default function About() {

    const md = `# zkApp: Zero-Knowledge dApp Boilerplate`;

    const submitSetup = async (event: any) => {
        console.log(event);
        event.preventDefault();
        // setError(false);
        // setCallOutput(false);

        // setSubmittingSetup(true);
        // await contract.submitSetup(submitSetupInput).then(
        //     (value: any) => {
        //         setCallOutputMsg(value);
        //         setCallOutput(true);
        //     },
        //     (error: any) => {
        //         setErrorMsg(error.toString());
        //         setError(true);
        //         setSubmittingSetup(false);
        //     });

        // setSubmittingSetup(false);
        // event.preventDefault();
    }

    var state = false;
    
    const getPos = async (currentPosition: any) => {
        console.log(currentPosition);
    }

    return (
        <Box
            sx={{
                "& .MuiTextField-root": { m: 1, width: "95%" },
                width: "99%", margin: 'auto'
            }}
        >
            <ReactMarkdown children={md}/>
            <Chessboard position={{ e5: 'wK', e4: 'wP', e7: 'bK' }} sparePieces getPosition={getPos} />
            
            <Button
                onClick={submitSetup}
                variant="contained">
                Submit
            </Button>
        </Box>
    );

}