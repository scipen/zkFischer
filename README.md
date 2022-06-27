zkFischer is a variant of [Fischer random chess](https://en.wikipedia.org/wiki/Fischer_random_chess) using zkSNARKs.

In this variant, you start by rearranging your back rank however you want. All pieces will be kept secret except for your king. During gameplay, you will generate ZKPs to show that you are only making valid moves. The game ends when a king is captured.

Currently, there is no pawn promotion or en passant due to hitting contract bytecode size limitations. There is also no castling, 3-fold repetition, or 50 move rule. It is legal to move your king into check.

Play here: [https://zk-fischer.vercel.app/](https://zk-fischer.vercel.app/) (only one active game at a time, globally)

Harmony devnet:
```
deploying "VerifyPlacementVerifier" (tx: 0xb7d69c0c88e3115e80a4cc49137c163518e1d89f86bc7d1fe10a1506f091e1a3)...: deployed at 0xa414216B4350be4F268DC5Ce85b4DfbD6342c2C1 with 2045633 gas

deploying "VerifyMoveVerifier" (tx: 0x7d5a992db1311a559fa09ba7a402ad065f711637f99838edd0f54a5ae789cf3b)...: deployed at 0x052Cc560E7B50DE11F754d2fe20A6857bedC8ceF with 2214845 gas

deploying "zkFischer" (tx: 0x9adef364ec1983e0de71a419e510def451ff39113dd3f6ae861befeb88f50e80)...: deployed at 0xE84CB61DeAfBb965A6d99Def08750a2c43130Ab7 with 6599672 gas
```

Boilerplate sources:
* https://github.com/socathie/zkApp/
* https://github.com/enu-kuro/zku-final-project/


## Building

In `hardhat/`, run `npm i` and `npm run test:full`. In `ui/`, run `npm i` and `npm run copy`.

To deploy to devnet, create `hardhat/.env` and add `HARMONY_PRIVATE_KEY=yourKey`. Then run `npx hardhat deploy --network devnet`. To test locally, go to `hardhat/` and run `npx hardhat node`.

Manually update `ui/src/artifacts/address.json` with your contract addresses and run `npm start`. Depending on your network, you may have to update some network specific configs in `ui/src/`.

## Mechanism

zkFischer uses two circuits: `verifyPlacement` and `verifyMove` (both in `hardhat/circuits`).

When a player initially sets up their board, they must send the contract a ZKP using `verifyPlacement` to prove that their setup is valid (2 rooks, 2 knights, etc). Their hashed board setup is committed to the contract.

During gameplay, the contract keep track of which squares are occupied by revealed pieces (i.e. pawn or king) and which are occupied by hidden ones. When a player moves a hidden piece, they must send the contract a ZKP using `verifyMove` showing that this piece's starting location (public info) is consistent with the type of move it tried to make (e.g. diagonal implies bishop or queen) and the owner's committed board setup hash.

Both circuits include a public `gameKey` input and private `boardSetupKey` input to thwart rainbow attacks.

TODO: `gameKey` is currently hardcoded to 0 due to hitting a contract size limit.

## Playing

Should be self-explanatory once the UI is integrated (currently not).

## TODOs

* Add UI
* Enable more code by splitting up contract
* Add some missing chess rules
* Add variants like atomic chess