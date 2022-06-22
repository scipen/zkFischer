# zkFischer

Boilerplate sources:
* https://github.com/socathie/zkApp/
* https://github.com/enu-kuro/zku-final-project/


Run `npm i` to install. Check out `package.json` for other commands to compile circuits and contracts.

To deploy on Harmony testnet, run the above command first, then change the private key in `hardhat.config.js` to your own private key (Please be careful not to include your private key in any commit!). The contracts have also been deployed to the addresses to `deployed.txt` and can be accessed directly.

```shell
npx hardhat deploy --network testnet
```
