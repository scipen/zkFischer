import Fab from '@mui/material/Fab';
import Backdrop from '@mui/material/Backdrop';
import { useEffect, useState } from 'react';

const networks: {[key: string]: any} = {
  hardhat: {
    chainId: '0x539',
    chainName: 'Hardhat'
  },
  harmonyDevnet: {
    chainId: '0x635ae020',
    chainName: 'Harmony Devnet',
    nativeCurrency: {
      name: 'ONE',
      symbol: 'ONE',
      decimals: 18
    },
    rpcUrls: ['https://api.s0.ps.hmny.io'],
    blockExplorerUrls: ['https://explorer.ps.hmny.io']
  },
  harmonyTestnet: {
    chainId: '0x6357d2e0',
    chainName: 'Harmony Testnet',
    nativeCurrency: {
      name: 'ONE',
      symbol: 'ONE',
      decimals: 18
    },
    rpcUrls: ['https://api.s0.b.hmny.io'],
    blockExplorerUrls: ['https://explorer.pops.one']
  },
  harmonyMainnet: {
    chainId: '0x63564c40',
    chainName: 'Harmony Mainnet',
    nativeCurrency: {
      name: 'ONE',
      symbol: 'ONE',
      decimals: 18
    },
    rpcUrls: ['https://api.harmony.one'],
    blockExplorerUrls: ['https://explorer.harmony.one']
  },
  polygonMainnet: {
    chainId: '0x89',
    chainName: 'Polygon Mainnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com']
  },
}
const expectedNetwork: any = networks.polygonMainnet;

export default function WalletConnector(props: any) {
  const { ethereum } = window;

  if (!ethereum) {
    alert("Make sure you have Metamask installed!");
  }
  else {
    ethereum.on('chainChanged', () => {
      window.location.reload()
    })
    ethereum.on('accountsChanged', () => {
      window.location.reload()
    })
  }

  // const [currentAccount, setCurrentAccount] = useState<string | null>(null);
  const currentAccount = props.currentAccount;
  const setCurrentAccount = props.setCurrentAccount;
  const [correctChain, setCorrectChain] = useState<boolean | null>(null);

  const checkWalletIsConnected = async () => {

    const accounts = await ethereum.request({ method: 'eth_accounts' });

    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log("Found an authorized account: ", account);
      setCurrentAccount(account);
    } else {
      console.log("No authorized account found");
    }
  }

  const connectWalletHandler = async () => {
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      console.log("Found an account! Address: ", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (err) {
      console.log(err)
    }
  }

  const checkChainId = async () => {
    let chainId = await ethereum.request({ method: 'eth_chainId' });
    console.log("Chain ID:", chainId, parseInt(chainId));

    setCorrectChain(chainId === expectedNetwork.chainId);
  }

  const changeChainId = async () => {
    let chainId = await ethereum.request({ method: 'eth_chainId' });

    if (chainId !== expectedNetwork.chainId) {
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{
            chainId: expectedNetwork.chainId
          }], // chainId must be in hexadecimal numbers
        });
        chainId = await ethereum.request({ method: 'eth_chainId' });
      } catch (error) {
        // This error code indicates that the chain has not been added to MetaMask
        // if it is not, then install it into the user MetaMask
        if (error.code === 4902) {
          try {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [expectedNetwork],
            });
          } catch (addError) {
            console.error(addError);
          }
        }
        console.error(error);
      }
      window.location.reload();
    }
    setCorrectChain(chainId === expectedNetwork.chainId);
  }

  const changeAccount = async () => {
    await ethereum.request({
      method: 'wallet_requestPermissions',
      params: [{
        eth_accounts: {},
      }]
    });
    window.location.reload();
  }

  useEffect(() => {
    checkWalletIsConnected();
    checkChainId();
  })


  const ConnectWalletFab = () => {
    return (
      <div>
        <Backdrop open={true} />
        <Fab variant="extended" color="primary" onClick={connectWalletHandler} sx={{
          position: "fixed",
          bottom: (theme) => theme.spacing(2),
          right: (theme) => theme.spacing(2)
        }}>
          Connect Wallet
        </Fab>
      </div>
    )
  }

  const WrongNetworkFab = () => {
    return (
      <div>
        <Backdrop open={true} />
        <Fab variant="extended" color="secondary" onClick={changeChainId} sx={{
          position: "fixed",
          bottom: (theme) => theme.spacing(2),
          right: (theme) => theme.spacing(2)
        }}>
          Wrong Network (expected: {expectedNetwork.chainName})
        </Fab>
      </div>
    )
  }

  const AccountFab = () => {
    return (
      <Fab variant="extended" onClick={changeAccount} sx={{
        position: "fixed",
        top: "auto",
        bottom: (theme) => theme.spacing(3),
        right: (theme) => theme.spacing(2)
      }}>
        {currentAccount?.slice(0, 8)}...{currentAccount?.slice(-5)}
      </Fab>
    )
  }

  return (
    <div>
      {(currentAccount && correctChain) ? <AccountFab /> : (currentAccount ? <WrongNetworkFab /> : <ConnectWalletFab />)}
    </div>
  )
}
