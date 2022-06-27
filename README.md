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