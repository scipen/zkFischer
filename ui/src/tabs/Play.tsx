import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ReactMarkdown from 'react-markdown';
import Chessboard from 'chessboardjsx';


export default function Play() {

    const md = `# zkFischer`;

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
            <Chessboard position={{
                a2: 'wP', b2: 'wP', c2: 'wP', d2: 'wP', e2: 'wP', f2: 'wP', g2: 'wP', h2: 'wP',
                a7: 'bP', b7: 'bP', c7: 'bP', d7: 'bP', e7: 'bP', f7: 'bP', g7: 'bP', h7: 'bP',
                e4: 'wK', e5: 'bK'
            }} sparePieces getPosition={getPos} />
            
            <br />
            <Button
                onClick={submitSetup}
                variant="contained">
                Submit
            </Button>
        </Box>
    );

}