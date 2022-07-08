import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from "@mui/material/Typography";
import ReactMarkdown from 'react-markdown';
import TabPanel from "./helpers/TabPanel";

const mdAbout = `
zkFischer is a novel variant of [Fischer Random Chess](https://en.wikipedia.org/wiki/Fischer_random_chess).
Compared to standard chess, where memorizing openings is important, zkFischer emphasizes skill and creativity by
allowing you to **rearrange your starting back rank** while keeping that setup **hidden from your opponent**.

The game runs fully on-chain using zkSNARKs to allow only legal moves. Built as part of [ZKU](https://zku.one/).

**Github:** [https://github.com/scipen/zkFischer](https://github.com/scipen/zkFischer)  
**Demo:** [https://www.youtube.com/watch?v=GyXw3iMLfX0](https://www.youtube.com/watch?v=GyXw3iMLfX0)  
**Polygon Mainnet:** [https://zk-fischer.vercel.app/](https://zk-fischer.vercel.app/)  
**Harmony Devnet:** [https://zk-fischer-git-dev-scipen.vercel.app/](https://zk-fischer-git-dev-scipen.vercel.app/)
    `;

    const mdHow = `
**Quickstart:** On the "Play" tab, just follow the instructions on the right panel. 

1. Find a partner and agree on shared Game ID.
1. Click **Join Game** and wait for your partner to do the same.
1. Drag pieces onto the back rank to specify your desired setup. Click **Submit Setup**.
    * You must place 1 king, 1 queen, 2 rooks, 2 bishops, and 2 knights.
    * Don't know how to play chess? Learn how the pieces move: [https://lichess.org/learn#/](https://lichess.org/learn#/)
    * You can optionally modify \`boardSetupKey\` (a randomly generated salt) on the "Configure" tab if you'd like.
1. When both players have finished setup, the game will start.
    * Click **Submit Move** after making each move.
    * Your back rank pieces (except for king) will all be hidden from your opponent's perspective.
Hidden pieces show up as ghosts but must still move according to their true identity.
    
zkFischer special rules:
* The game ends on king capture. It's legal to have your king in check.
* Pawns automatically promote to queens.
* There's currently no castling, en passant, 3 fold repetition, or game turn limit.
Some of these might be added in the future.

Avoid refreshing the page for the best experience (resuming from local state is possible but might be buggy!).
    `;

    const mdFaq = `
**Q: My piece suddenly disappeared / my local board got corrupted!**  
**A:** Sorry, there's only limited client-side validation right now. Try refreshing the page and clicking "Restore Game".  

**Q: My opponent moved over 60 seconds ago and my screen still hasn't updated.**  
**A:** Check the console for error messages -- there may be a bug or just network congestion. Try refreshing the page and clicking "Restore Game".  

**Q: Can I play against an AI?**  
**A:** Not currently.

**Q: Is there matchmaking?**  
**A:** Not currently.

**Q: Is there a time limit?**  
**A:** Not currently.

**Q: Why does the first person to join a game pay more gas?**  
**A:** That account initializes the game state (contract storage).

**Q: Can I play multiple games simultaneously?**  
**A:** Yes in the backend, but the UI currently doesn't support it.

**Q: Can I resume my game from a different browser?**  
**A:** Not easily. The identities of your hidden pieces (everything except for king/pawn) are not stored on chain; they are stored in browser local storage.
You will also need to export the private circuit inputs you used during game setup. Everything is stored under [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) prefix \`zkFischer\`.

**Q: How does this work?**  
**A:** See the Github README or demo (linked above) for more info.

**Q: Will there be improvements?**  
**A:** Maybe. First focus is on usability and bugfixes. Then on adding pawn promotion. Then on adding fun variants like [atomic](https://en.wikipedia.org/wiki/Atomic_chess).
    `;

export default function About(props: any) {
    return (
        <TabPanel value={props.tabValue} index={props.index}>
            <Grid container spacing={1} direction="column">
                <Grid item>
                    <Paper>
                        <Typography align="center">About</Typography>
                    </Paper>
                </Grid>
                <Grid item>
                    <ReactMarkdown children={mdAbout}/>
                </Grid>
                <Grid item>
                    <Paper>
                        <Typography align="center">How to Play</Typography>
                    </Paper>
                </Grid>
                <Grid item>
                    <ReactMarkdown children={mdHow}/>
                </Grid>
                <Grid item>
                    <Paper>
                        <Typography align="center">FAQ & Troubleshooting</Typography>
                    </Paper>
                </Grid>
                <Grid item>
                    <ReactMarkdown children={mdFaq}/>
                </Grid>
            </Grid> 
        </TabPanel>
    )
}